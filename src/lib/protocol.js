// postMessage protocol between a host page (public/widget.js, mcp-chat-react) and the chat app in ?embed=1 mode.
// public/widget.js is plain ES5 served as-is, so it duplicates these strings - keep both in sync.

// iframe -> host
export const MSG_READY = "mcp-chat:ready"; // app loaded; host replies with its current context/user/theme
export const MSG_CLOSE = "mcp-chat:close"; // user pressed the close button in the header
export const MSG_SETTINGS = "mcp-chat:settings"; // { settings: { title, accent_color, position } } from the admin console

// host -> iframe
export const MSG_CONTEXT = "mcp-chat:context"; // { context: string | null }
export const MSG_USER = "mcp-chat:user"; // { user: { id, name, email?, role? } | null }
export const MSG_THEME = "mcp-chat:theme"; // { theme: "light" | "dark" | "auto" }
export const MSG_PAGE = "mcp-chat:page"; // { page: { url, title, referrer, viewport } } - stored with a new session

export const THEMES = ["light", "dark", "auto"];
// Matches the llm-server ChatRequest.context max_length.
export const MAX_CONTEXT = 2000;

export const normalizeTheme = (theme) => (THEMES.includes(theme) ? theme : "auto");

const field = (v) => (v === undefined || v === null || v === "" ? undefined : String(v).slice(0, 200));

// Keeps only the known string fields so arbitrary host objects never reach the prompt.
export function sanitizeUser(user) {
  if (!user || typeof user !== "object") return null;
  const clean = { id: field(user.id), name: field(user.name), email: field(user.email), role: field(user.role) };
  return clean.id || clean.name ? clean : null;
}

// "User: Jane Doe (partner, id u-42, jane@firm.com)"
export function describeUser(user) {
  const u = sanitizeUser(user);
  if (!u) return null;
  const details = [u.role, u.id && `id ${u.id}`, u.email].filter(Boolean);
  return `User: ${u.name || "unknown"}${details.length ? ` (${details.join(", ")})` : ""}`;
}

// What is sent as `context` to POST /api/chat. The user line goes first so truncation only cuts page context.
export function buildContext(user, context) {
  const text = [describeUser(user), typeof context === "string" ? context.trim() : null].filter(Boolean).join("\n");
  return text ? text.slice(0, MAX_CONTEXT) : undefined;
}

// The page the widget is on: the host page (sent by the iframe embeds' host side, read directly by the Shadow DOM
// embed). Lengths match the llm-server ClientInfo.
const text = (v, max) => (typeof v === "string" && v ? v.slice(0, max) : undefined);
const size = (v) => (Number.isFinite(v) && v >= 0 ? Math.min(Math.round(v), 100000) : undefined);

export function sanitizePage(page) {
  if (!page || typeof page !== "object") return null;
  const clean = { url: text(page.url, 2000), title: text(page.title, 300), referrer: text(page.referrer, 2000) };
  const viewport = page.viewport && { width: size(page.viewport.width), height: size(page.viewport.height) };
  if (viewport?.width !== undefined || viewport?.height !== undefined) clean.viewport = viewport;
  return clean.url || clean.title || clean.referrer || clean.viewport ? clean : null;
}

export function currentPage() {
  try {
    return sanitizePage({
      url: window.location.href,
      title: document.title,
      referrer: document.referrer,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
  } catch {
    return null;
  }
}
