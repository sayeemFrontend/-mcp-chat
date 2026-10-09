import { forwardRef, useCallback, useEffect, useImperativeHandle, useInsertionEffect, useMemo, useRef, useState } from "react";

// Same protocol and sanitizing as the chat app itself (bundled in at build time).
import {
  MSG_CLOSE,
  MSG_CONTEXT,
  MSG_PAGE,
  MSG_READY,
  MSG_THEME,
  MSG_USER,
  currentPage,
  normalizeTheme,
  sanitizeUser,
} from "../../../src/lib/protocol.js";

const STYLE_ID = "mcp-chat-react-styles";
// Injected once into <head>, so consumers don't import any CSS. Mirrors the look of public/widget.js.
const CSS = `
.mcpcr-launcher{position:fixed;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:9999px;
color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;
box-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease}
.mcpcr-launcher:hover{transform:scale(1.06)}
.mcpcr-launcher:focus-visible{outline:3px solid rgba(59,130,246,.6);outline-offset:2px}
.mcpcr-panel{position:fixed;bottom:88px;z-index:2147483000;width:420px;height:min(680px,calc(100vh - 110px));
border-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.28);
opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}
.mcpcr-panel.mcpcr-open{opacity:1;transform:none;pointer-events:auto}
.mcpcr-right{right:20px}.mcpcr-left{left:20px}
.mcpcr-panel.mcpcr-dark,.mcpcr-inline.mcpcr-dark{background:#252525}
@media (prefers-color-scheme:dark){.mcpcr-panel.mcpcr-auto,.mcpcr-inline.mcpcr-auto{background:#252525}}
.mcpcr-frame{width:100%;height:100%;border:0;display:block}
.mcpcr-inline{position:relative;width:100%;height:100%;overflow:hidden;background:#fff}
@media (max-width:520px){.mcpcr-panel{inset:0;width:auto;height:auto;border-radius:0}
.mcpcr-panel.mcpcr-open~.mcpcr-launcher{display:none}}`;

const Icon = ({ children }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);
const ChatIcon = () => (
  <Icon>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
  </Icon>
);
const CloseIcon = () => (
  <Icon>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);

const cx = (...parts) => parts.filter(Boolean).join(" ");

export const ChatWidget = forwardRef(function ChatWidget(
  {
    src,
    title,
    greeting,
    suggestions,
    chatKey,
    tenant,
    context,
    user,
    theme = "auto",
    position = "right",
    color = "#171717",
    variant = "floating",
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    onReady,
    className,
    style,
  },
  ref
) {
  if (!src) throw new Error("<ChatWidget>: the `src` prop (chat app origin) is required");
  const inline = variant === "inline";
  const side = position === "left" ? "left" : "right";
  const themeName = normalizeTheme(theme);
  const cleanUser = useMemo(() => sanitizeUser(user), [user?.id, user?.name, user?.email, user?.role]);
  const contextText = typeof context === "string" && context ? context : null;

  // Controlled when `open` is passed; inline is always open.
  const controlled = openProp !== undefined;
  const [openState, setOpenState] = useState(!!defaultOpen);
  const open = inline || (controlled ? !!openProp : openState);
  // The iframe is created on first open, then kept (with its conversation) while closed.
  const [loaded, setLoaded] = useState(open);
  if (open && !loaded) setLoaded(true);

  const iframeRef = useRef(null);
  const readyRef = useRef(false);
  // Latest values for callbacks/listeners that shouldn't re-subscribe on every render.
  const latest = useRef(null);
  latest.current = { open, controlled, onOpenChange, onReady, context: contextText, user: cleanUser, theme: themeName };

  const origin = useMemo(() => new URL(src).origin, [src]);
  const suggestionsKey = Array.isArray(suggestions) ? suggestions.join("|") : "";
  // Only these reload the iframe; theme is read once here and pushed live afterwards.
  const frameSrc = useMemo(() => {
    const query = new URLSearchParams({ embed: "1", theme: latest.current.theme });
    // Unset title/greeting = the tenant's widget settings from the admin console
    if (title) query.set("title", title);
    if (greeting) query.set("greeting", greeting);
    if (suggestionsKey) query.set("suggestions", suggestionsKey);
    if (inline) query.set("closable", "0");
    if (tenant) query.set("tenant", tenant);
    const url = new URL(`?${query}`, src.endsWith("/") ? src : `${src}/`);
    // The widget key goes in the fragment (never sent to a server). It decides the tenant.
    if (chatKey) url.hash = `key=${encodeURIComponent(chatKey)}`;
    return url.toString();
  }, [src, title, greeting, suggestionsKey, inline, chatKey, tenant]);

  const post = useCallback(
    (message) => {
      const win = iframeRef.current?.contentWindow;
      // Before "ready" the app isn't listening yet; everything is flushed when it is.
      if (readyRef.current && win) win.postMessage(message, origin);
    },
    [origin]
  );

  const setOpen = useCallback((next) => {
    const cur = latest.current;
    if (next === cur.open) return;
    if (!cur.controlled) setOpenState(next);
    cur.onOpenChange?.(next);
  }, []);

  useInsertionEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);

  // A new document is loading; wait for its "ready" before posting again.
  useEffect(() => {
    readyRef.current = false;
  }, [frameSrc, loaded]);

  useEffect(() => {
    const onMessage = (e) => {
      // Only our own iframe, from the chat origin.
      if (e.origin !== origin || !iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === MSG_READY) {
        // Can repeat for one document (React StrictMode in dev): re-send state, report once.
        const first = !readyRef.current;
        readyRef.current = true;
        const { theme: t, user: u, context: c } = latest.current;
        post({ type: MSG_THEME, theme: t });
        post({ type: MSG_USER, user: u });
        post({ type: MSG_CONTEXT, context: c });
        post({ type: MSG_PAGE, page: currentPage() });
        if (first) latest.current.onReady?.();
      } else if (data.type === MSG_CLOSE && !inline) {
        setOpen(false);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, post, setOpen, inline]);

  // Live updates without reloading the iframe.
  useEffect(() => post({ type: MSG_CONTEXT, context: contextText }), [post, contextText]);
  useEffect(() => post({ type: MSG_USER, user: cleanUser }), [post, cleanUser]);
  useEffect(() => post({ type: MSG_THEME, theme: themeName }), [post, themeName]);
  // The host page, recorded when a session starts; re-sent on open so the app's current route is the one recorded.
  useEffect(() => {
    if (open) post({ type: MSG_PAGE, page: currentPage() });
  }, [post, open]);

  useImperativeHandle(
    ref,
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen(!latest.current.open),
    }),
    [setOpen]
  );

  const frame = loaded && (
    <iframe ref={iframeRef} className="mcpcr-frame" src={frameSrc} title={title} allow="clipboard-write" />
  );

  if (inline) {
    return (
      <div className={cx("mcpcr-inline", `mcpcr-${themeName}`, className)} style={style} data-mcp-chat="">
        {frame}
      </div>
    );
  }

  return (
    <div className={className} style={style} data-mcp-chat="">
      <div
        className={cx("mcpcr-panel", `mcpcr-${side}`, `mcpcr-${themeName}`, open && "mcpcr-open")}
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
      >
        {frame}
      </div>
      <button
        type="button"
        className={cx("mcpcr-launcher", `mcpcr-${side}`)}
        style={{ background: color }}
        aria-label={open ? "Close chat" : "Open chat"}
        onClick={() => setOpen(!open)}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  );
});
