/*
 * Shadow DOM embed (no iframe): built by vite.embed.config.js into a single IIFE served as /embed.js.
 *
 *   <script src="https://<chat-host>/embed.js"></script>
 *   <script>McpChatEmbed.mount({ apiUrl: "https://<llm-server>" })</script>
 *
 * or <script src=".../embed.js" data-auto-mount="true" data-api-url="..." data-title="..."></script>. See README.md.
 * `key` / data-key (the tenant's widget key) is optional: without one the chat is the public assistant.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createServices } from "@/api/services";
import { normalizeTheme, sanitizeUser } from "@/lib/protocol";

import rawCss from "../index.css?inline";
import { EmbedRoot } from "./EmbedRoot";

const VERSION = "0.1.0";
const TAG = "mcp-chat-embed";

// rem is relative to the *host page's* <html> font-size (often 62.5%), so pin everything to a 16px base.
const CSS = rawCss.replace(/(-?\d*\.?\d+)rem\b/g, (_, n) => `${+(parseFloat(n) * 16).toFixed(3)}px`);

// Browsers ignore @property inside shadow roots, which leaves Tailwind's --tw-* variables (shadows, rings,
// translate/scale) without initial values and silently drops those declarations. Registering them on the document
// is harmless for the host page: they only give these internal variables a default.
function registerProperties() {
  if (document.getElementById("mcp-chat-embed-properties")) return;
  const rules = CSS.match(/@property\s+[\w-]+\s*\{[^}]*\}/g);
  if (!rules) return;
  const style = document.createElement("style");
  style.id = "mcp-chat-embed-properties";
  style.textContent = rules.join("\n");
  document.head.appendChild(style);
}

// !important so host rules for the element (e.g. `* { ... }` resets) can't win over :host;
// `all: initial` stops inherited host fonts/colors/line-height from leaking in.
const HOST_CSS = `
:host { all: initial !important; display: block !important; }
:host([data-variant="floating"]) { position: static !important; width: 0 !important; height: 0 !important; }
:host([data-variant="inline"]) { width: 100% !important; height: 100% !important; min-height: 320px; }
.mcp-embed-root {
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px; line-height: 1.5; color: var(--foreground); text-align: left;
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}`;

let sheet = null;
function adoptStyles(shadow) {
  // One constructed stylesheet shared by all mounts; fall back to a <style> per root on older browsers.
  try {
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(CSS + HOST_CSS);
    }
    shadow.adoptedStyleSheets = [sheet];
  } catch {
    const style = document.createElement("style");
    style.textContent = CSS + HOST_CSS;
    shadow.appendChild(style);
  }
}

function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    get: () => state,
    set: (patch) => {
      state = { ...state, ...patch };
      listeners.forEach((l) => l());
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

function resolveTarget(target) {
  if (!target) return null;
  if (typeof target === "string") return document.querySelector(target);
  return target instanceof Element ? target : null;
}

const instances = new Set();

function mount(options = {}) {
  if (!options.apiUrl) throw new Error("McpChatEmbed.mount: `apiUrl` (the LLM server URL) is required");
  // Optional: without a key the chat is the public assistant (open data, no business)
  const key = options.key || options.chatKey || undefined;
  const variant = options.variant === "inline" ? "inline" : "floating";
  const target = variant === "inline" ? resolveTarget(options.target) : null;
  if (variant === "inline" && !target) throw new Error("McpChatEmbed.mount: inline variant needs a `target` element");

  const opts = {
    variant,
    // Unset = the tenant's widget settings from the admin console
    title: options.title || undefined,
    greeting: options.greeting || undefined,
    suggestions: Array.isArray(options.suggestions) && options.suggestions.length ? options.suggestions : undefined,
    position: options.position === "left" || options.position === "right" ? options.position : undefined,
    color: options.color || undefined,
  };
  const store = createStore({
    open: variant === "inline" || !!options.defaultOpen,
    context: typeof options.context === "string" ? options.context : null,
    user: sanitizeUser(options.user),
    theme: normalizeTheme(options.theme),
  });

  registerProperties();
  const host = document.createElement(TAG);
  host.setAttribute("data-variant", variant);
  const shadow = host.attachShadow({ mode: "open" });
  adoptStyles(shadow);
  const container = document.createElement("div");
  if (variant === "inline") container.style.height = "100%";
  shadow.appendChild(container);

  const root = createRoot(container);
  root.render(
    <StrictMode>
      <EmbedRoot
        store={store}
        services={createServices(String(options.apiUrl).replace(/\/+$/, ""), { chatKey: key, tenant: options.tenant })}
        options={opts}
      />
    </StrictMode>
  );

  const attach = () => (target || document.body).appendChild(host);
  if (target || document.body) attach();
  else document.addEventListener("DOMContentLoaded", attach, { once: true });

  let mounted = true;
  const instance = {
    open: () => variant === "floating" && store.set({ open: true }),
    close: () => variant === "floating" && store.set({ open: false }),
    toggle: () => variant === "floating" && store.set({ open: !store.get().open }),
    isOpen: () => store.get().open,
    setContext: (text) => store.set({ context: text ? String(text) : null }),
    setUser: (user) => store.set({ user: sanitizeUser(user) }),
    setTheme: (theme) => store.set({ theme: normalizeTheme(theme) }),
    unmount: () => {
      if (!mounted) return;
      mounted = false;
      root.unmount();
      host.remove();
      instances.delete(instance);
    },
  };
  instances.add(instance);
  return instance;
}

function optionsFromScript(ds) {
  let user = null;
  if (ds.user) {
    try {
      user = JSON.parse(ds.user);
    } catch {
      console.warn("[mcp-chat] data-user must be JSON, e.g. '{\"id\":\"u1\",\"name\":\"Jane\"}'");
    }
  }
  return {
    apiUrl: ds.apiUrl,
    key: ds.key || ds.chatKey,
    tenant: ds.tenant,
    variant: ds.variant,
    target: ds.target,
    title: ds.title,
    greeting: ds.greeting,
    suggestions: ds.suggestions?.split("|").filter(Boolean),
    context: ds.context,
    user,
    theme: ds.theme,
    position: ds.position,
    color: ds.color,
    defaultOpen: ds.defaultOpen === "true" || ds.open === "true",
  };
}

// Including the script twice keeps the first copy (and its mounts) and does nothing else.
if (!window.McpChatEmbed) {
  window.McpChatEmbed = { version: VERSION, mount, instances: () => [...instances] };

  const script = document.currentScript;
  if (script?.dataset.autoMount === "true") {
    const run = () => {
      try {
        window.McpChatEmbed.autoMounted = mount(optionsFromScript(script.dataset));
      } catch (e) {
        console.error("[mcp-chat]", e);
      }
    };
    // The inline target usually comes after the script tag in the page.
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }
}
