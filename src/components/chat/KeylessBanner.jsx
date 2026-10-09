import { KeyRound, X } from "lucide-react";
import { useState } from "react";

import { useWidgetSettings } from "@/hooks/useWidgetSettings";

// The admin console (admin-frontend); its /signup page creates a business and its account, then Keys makes a key.
// Build-time, nothing secret: the Shadow DOM bundle gets it baked in too.
const ADMIN_URL = (import.meta.env.VITE_ADMIN_URL || "http://localhost:5175").replace(/\/+$/, "");
const SIGNUP_URL = `${ADMIN_URL}/signup`;
// Dismissed for this browser session only (sessionStorage: per tab; in the iframe embeds the chat app's own).
const DISMISSED = "mcp-chat:keyless-banner-dismissed";

function wasDismissed() {
  try {
    return window.sessionStorage.getItem(DISMISSED) === "1";
  } catch {
    return false;
  }
}

// A one-line hint above the messages while the chat runs without a widget key (the public assistant). Shown only
// when the server says so (`GET /api/widget` -> `public: true`), so a keyed widget never shows it, not even while
// loading or after an error.
export function KeylessBanner({ services }) {
  const settings = useWidgetSettings(services);
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (settings?.public !== true || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED, "1");
    } catch {
      // unavailable: hidden until the next load
    }
  };

  return (
    <aside
      aria-label="Widget key"
      className="flex shrink-0 items-center gap-2 border-b bg-muted/60 py-1.5 pr-1.5 pl-4 text-xs text-muted-foreground"
    >
      <KeyRound className="size-3.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        Want answers from your own business data? Add your widget key.{" "}
        <a
          href={SIGNUP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium whitespace-nowrap text-foreground underline underline-offset-2 hover:opacity-80 focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Get a key
          <span className="sr-only"> (opens the sign-up page in a new tab)</span>
        </a>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        title="Dismiss"
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <X className="size-3.5" />
      </button>
    </aside>
  );
}
