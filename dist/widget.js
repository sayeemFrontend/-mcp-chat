/*
 * MCP Chat embeddable widget (loader + iframe). See chat-widget/README.md for all options.
 *
 *   <script src="https://<chat-host>/widget.js" data-key="pk_..." defer></script>
 *
 * Adds a floating launcher button that opens the chat app (this build, ?embed=1) in an iframe.
 * Options (data-* attributes on the script tag). Title, greeting, color and position default to the widget
 * settings the tenant chose in the admin console; an attribute here overrides them.
 *   data-key          the tenant's widget key (required): pk_... from the admin console
 *   data-title        header title inside the widget
 *   data-position     "right" | "left"
 *   data-color        launcher background color, also the chat's accent (#rrggbb)
 *   data-theme        "light" | "dark" | "auto"              (default "auto" = follows the OS)
 *   data-open         "true" to open on load
 *   data-greeting     heading on the empty chat
 *   data-suggestions  starter prompts, separated by "|"
 *   data-tenant       optional: the tenant id; the key must then belong to that tenant
 * JS API (window.McpChatWidget):
 *   open() / close() / toggle() / isOpen()
 *   setContext("what the user is looking at")       - sent with every message
 *   setUser({ id, name, email?, role? } | null)    - the signed-in user, also sent as context
 *   setTheme("light" | "dark" | "auto")
 *   on("ready" | "open" | "close", handler)         - returns an unsubscribe function
 */
(function () {
  // Included twice: keep the first instance.
  if (window.McpChatWidget) return;

  // Protocol strings - keep in sync with src/lib/protocol.js.
  var MSG_READY = "mcp-chat:ready";
  var MSG_CLOSE = "mcp-chat:close";
  var MSG_CONTEXT = "mcp-chat:context";
  var MSG_USER = "mcp-chat:user";
  var MSG_THEME = "mcp-chat:theme";
  var MSG_SETTINGS = "mcp-chat:settings";
  var MSG_PAGE = "mcp-chat:page";

  var script = document.currentScript;
  var ds = (script && script.dataset) || {};
  var origin = new URL(script ? script.src : location.href).origin;
  var side = ds.position === "left" ? "left" : "right";
  var color = ds.color || "#171717";
  var title = ds.title || "Assistant";
  var key = ds.key || ds.chatKey; // data-chat-key: older name of data-key
  if (!key) console.warn("[mcp-chat] widget.js needs data-key: the tenant's widget key from the admin console");

  function normalizeTheme(t) {
    return t === "light" || t === "dark" ? t : "auto";
  }

  // Host-side state; (re)sent in full whenever the iframe reports ready, so nothing set before load is lost.
  var state = { context: null, user: null, theme: normalizeTheme(ds.theme) };

  var query = new URLSearchParams({ embed: "1", theme: state.theme });
  if (ds.title) query.set("title", ds.title);
  if (ds.tenant) query.set("tenant", ds.tenant);
  if (ds.greeting) query.set("greeting", ds.greeting);
  if (ds.suggestions) query.set("suggestions", ds.suggestions);
  if (ds.color) query.set("color", ds.color);
  // The key travels in the fragment, which browsers never send to a server.
  var src = origin + "/?" + query.toString() + (key ? "#key=" + encodeURIComponent(key) : "");

  var CHAT_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>';
  var CLOSE_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  var style = document.createElement("style");
  style.textContent =
    ".mcpw-left{left:20px}.mcpw-right{right:20px}" +
    ".mcpw-launcher{position:fixed;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:9999px;" +
    "background:" + color + ";color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;" +
    "box-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease}" +
    ".mcpw-launcher:hover{transform:scale(1.06)}" +
    ".mcpw-launcher:focus-visible{outline:3px solid rgba(59,130,246,.6);outline-offset:2px}" +
    ".mcpw-panel{position:fixed;bottom:88px;z-index:2147483000;width:420px;height:min(680px,calc(100vh - 110px));" +
    "border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.28);" +
    "opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}" +
    ".mcpw-panel.mcpw-open{opacity:1;transform:none;pointer-events:auto}" +
    ".mcpw-panel iframe{width:100%;height:100%;border:0;display:block}" +
    ".mcpw-panel.mcpw-dark{background:#252525}" +
    "@media (prefers-color-scheme:dark){.mcpw-panel.mcpw-auto{background:#252525}}" +
    "@media (max-width:520px){.mcpw-panel{inset:0;width:auto;height:auto;border-radius:0}.mcpw-panel.mcpw-open~.mcpw-launcher{display:none}}";
  document.head.appendChild(style);

  var panel = document.createElement("div");
  panel.className = "mcpw-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", title);

  var button = document.createElement("button");
  button.className = "mcpw-launcher";
  button.type = "button";
  button.setAttribute("aria-label", "Open chat");
  button.innerHTML = CHAT_ICON;

  var iframe = null;
  var ready = false;
  var isOpen = false;
  var handlers = { ready: [], open: [], close: [] };

  function emit(event) {
    handlers[event].slice().forEach(function (fn) {
      try {
        fn();
      } catch (err) {
        console.error("[mcp-chat] " + event + " handler failed", err);
      }
    });
  }

  function post(message) {
    // Until the app says it's ready the message would be lost; state is flushed on ready instead.
    if (ready && iframe && iframe.contentWindow) iframe.contentWindow.postMessage(message, origin);
  }

  // This page, which the chat records when a session starts (the iframe can't read it). Re-sent on every open, so
  // a single-page app's current route is the one recorded.
  function postPage() {
    var viewport = { width: window.innerWidth, height: window.innerHeight };
    post({ type: MSG_PAGE, page: { url: location.href, title: document.title, referrer: document.referrer, viewport: viewport } });
  }

  function flush() {
    post({ type: MSG_THEME, theme: state.theme });
    post({ type: MSG_USER, user: state.user });
    post({ type: MSG_CONTEXT, context: state.context });
    postPage();
  }

  function applyTheme() {
    panel.classList.remove("mcpw-light", "mcpw-dark", "mcpw-auto");
    panel.classList.add("mcpw-" + state.theme);
  }

  function setSide(next) {
    side = next === "left" ? "left" : "right";
    [panel, button].forEach(function (el) {
      el.classList.remove("mcpw-left", "mcpw-right");
      el.classList.add("mcpw-" + side);
    });
  }

  // The tenant's settings from the admin console, reported by the chat app; data-* attributes win.
  function applySettings(s) {
    if (!s || typeof s !== "object") return;
    if (!ds.color && /^#[0-9a-fA-F]{6}$/.test(s.accent_color || "")) button.style.background = s.accent_color;
    if (!ds.position && s.position) setSide(s.position === "bottom-left" ? "left" : "right");
    if (!ds.title && s.title) {
      title = String(s.title).slice(0, 60);
      panel.setAttribute("aria-label", title);
      if (iframe) iframe.title = title;
    }
  }

  // The chat app loads right away (hidden) so the tenant's widget settings apply before the first open.
  function loadFrame() {
    if (iframe) return;
    iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = title;
    iframe.allow = "clipboard-write";
    panel.appendChild(iframe);
  }

  function setOpen(next) {
    next = !!next;
    if (next === isOpen) return;
    isOpen = next;
    // Focus moves into the chat on open (the app then focuses its input) and back to the launcher when the chat
    // that had it closes.
    if (isOpen) {
      loadFrame();
      postPage();
      iframe.focus();
    } else if (document.activeElement === iframe) {
      button.focus();
    }
    panel.classList.toggle("mcpw-open", isOpen);
    button.innerHTML = isOpen ? CLOSE_ICON : CHAT_ICON;
    button.setAttribute("aria-label", isOpen ? "Close chat" : "Open chat");
    emit(isOpen ? "open" : "close");
  }

  button.addEventListener("click", function () {
    setOpen(!isOpen);
  });

  // Messages from the embedded app - only our own iframe, from the chat origin.
  window.addEventListener("message", function (e) {
    if (e.origin !== origin || !iframe || e.source !== iframe.contentWindow) return;
    var data = e.data;
    if (!data || typeof data !== "object") return;
    if (data.type === MSG_CLOSE) setOpen(false);
    if (data.type === MSG_SETTINGS) applySettings(data.settings);
    if (data.type === MSG_READY) {
      // Can arrive more than once (iframe reload, React StrictMode in dev): always re-send state, emit once.
      var first = !ready;
      ready = true;
      flush();
      if (first) emit("ready");
    }
  });

  function cleanUser(user) {
    if (!user || typeof user !== "object") return null;
    var out = {};
    ["id", "name", "email", "role"].forEach(function (k) {
      if (user[k] !== undefined && user[k] !== null && user[k] !== "") out[k] = String(user[k]);
    });
    return out.id || out.name ? out : null;
  }

  applyTheme();
  setSide(side);
  function mount() {
    document.body.appendChild(panel);
    document.body.appendChild(button);
    loadFrame();
    if (ds.open === "true") setOpen(true);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.McpChatWidget = {
    open: function () { setOpen(true); },
    close: function () { setOpen(false); },
    toggle: function () { setOpen(!isOpen); },
    isOpen: function () { return isOpen; },
    setContext: function (text) {
      state.context = text ? String(text) : null;
      post({ type: MSG_CONTEXT, context: state.context });
    },
    setUser: function (user) {
      state.user = cleanUser(user);
      post({ type: MSG_USER, user: state.user });
    },
    setTheme: function (theme) {
      state.theme = normalizeTheme(theme);
      applyTheme();
      post({ type: MSG_THEME, theme: state.theme });
    },
    on: function (event, handler) {
      if (!handlers[event] || typeof handler !== "function") throw new Error("McpChatWidget.on: unknown event " + event);
      handlers[event].push(handler);
      // A late "ready" subscriber still hears about it.
      if (event === "ready" && ready) setTimeout(handler, 0);
      return function () {
        var i = handlers[event].indexOf(handler);
        if (i >= 0) handlers[event].splice(i, 1);
      };
    },
  };
})();
