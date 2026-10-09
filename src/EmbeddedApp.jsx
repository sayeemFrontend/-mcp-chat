import { useCallback, useEffect, useRef, useState } from "react";

import { services } from "@/api/appServices";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import {
  MSG_CLOSE,
  MSG_SETTINGS,
  MSG_CONTEXT,
  MSG_PAGE,
  MSG_READY,
  MSG_THEME,
  MSG_USER,
  MAX_CONTEXT,
  buildContext,
  normalizeTheme,
  sanitizePage,
  sanitizeUser,
} from "@/lib/protocol";

// ?embed=1&title=..&greeting=..&suggestions=a|b&theme=light|dark|auto&closable=0 - set by widget.js / mcp-chat-react.
// Title and greeting default to the tenant's widget settings (admin console) when the host doesn't set them.
const params = new URLSearchParams(window.location.search);
const TITLE = params.get("title");
const GREETING = params.get("greeting");
const SUGGESTIONS = params.get("suggestions")?.split("|").filter(Boolean);
const CLOSABLE = params.get("closable") !== "0";
// Optional build-time allowlist of host origins that may push context/user/theme (comma-separated).
const ALLOWED_ORIGINS = (import.meta.env.VITE_EMBED_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function EmbeddedApp() {
  const [theme, setTheme] = useState(() => normalizeTheme(params.get("theme")));
  const dark = useDarkMode(theme);
  // Read at send time, so kept in a ref instead of state.
  const hostRef = useRef({ context: null, user: null, page: null });
  const settings = useWidgetSettings(services);

  useEffect(() => {
    if (!settings || window.parent === window) return;
    const { title, accent_color, position } = settings;
    window.parent.postMessage({ type: MSG_SETTINGS, settings: { title, accent_color, position } }, "*");
  }, [settings]);

  useEffect(() => {
    const onMessage = (e) => {
      // Only the embedding page may drive the widget; other frames/windows are ignored.
      if (e.source !== window.parent || window.parent === window) return;
      if (ALLOWED_ORIGINS.length && !ALLOWED_ORIGINS.includes(e.origin)) return;
      const data = e.data;
      if (!data || typeof data !== "object") return;
      if (data.type === MSG_CONTEXT) {
        hostRef.current.context = typeof data.context === "string" ? data.context.slice(0, MAX_CONTEXT) : null;
      } else if (data.type === MSG_USER) {
        hostRef.current.user = sanitizeUser(data.user);
      } else if (data.type === MSG_PAGE) {
        hostRef.current.page = sanitizePage(data.page);
      } else if (data.type === MSG_THEME) {
        setTheme(normalizeTheme(data.theme));
      }
    };
    window.addEventListener("message", onMessage);
    // Nothing secret in ready/close, so "*" is fine; the host verifies our origin on its side.
    window.parent.postMessage({ type: MSG_READY }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const getContext = useCallback(() => buildContext(hostRef.current.user, hostRef.current.context), []);
  // The host page as its side reported it; a host that doesn't report it: the address the browser gave as referrer.
  const getPage = useCallback(() => hostRef.current.page || sanitizePage({ url: document.referrer }), []);

  return (
    <TooltipProvider>
      <div className="h-screen overflow-hidden">
        <ChatPanel
          services={services}
          title={TITLE || settings?.title || "Assistant"}
          greeting={GREETING || settings?.greeting}
          suggestions={SUGGESTIONS}
          getContext={getContext}
          getPage={getPage}
          dark={dark}
          onToggleTheme={() => setTheme(dark ? "light" : "dark")}
          onClose={CLOSABLE ? () => window.parent.postMessage({ type: MSG_CLOSE }, "*") : undefined}
        />
      </div>
    </TooltipProvider>
  );
}
