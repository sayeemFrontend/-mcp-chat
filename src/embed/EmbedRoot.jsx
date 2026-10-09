import { MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useDarkMode } from "@/hooks/useDarkMode";
import { useWidgetSettings } from "@/hooks/useWidgetSettings";
import { PortalContainerContext } from "@/lib/portal";
import { buildContext, currentPage } from "@/lib/protocol";
import { cn } from "@/lib/utils";

// One mounted widget inside its shadow root. Host-page calls (open, setUser, ...) arrive through `store`.
export function EmbedRoot({ store, services, options: hostOptions }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  // The tenant's widget settings (admin console) fill in whatever the host page didn't set.
  const settings = useWidgetSettings(services);
  const options = {
    ...hostOptions,
    title: hostOptions.title || settings?.title || "Assistant",
    greeting: hostOptions.greeting || settings?.greeting,
    accent: hostOptions.color || settings?.accent_color,
    color: hostOptions.color || settings?.accent_color || "#171717",
    position: hostOptions.position || (settings?.position === "bottom-left" ? "left" : "right"),
  };
  const dark = useDarkMode(state.theme);
  const [portal, setPortal] = useState(null);
  // Mount the chat on first open only, then keep it (and its conversation) while closed.
  const [started, setStarted] = useState(state.open);
  // Bumped on every open of the floating chat, so it focuses its input (never for inline: it's always there).
  const [focusKey, setFocusKey] = useState(0);
  const inline = options.variant === "inline";

  useEffect(() => {
    if (!state.open) return;
    setStarted(true);
    if (!inline) setFocusKey((k) => k + 1);
  }, [state.open, inline]);

  const getContext = useCallback(() => {
    const { user, context } = store.get();
    return buildContext(user, context);
  }, [store]);

  const panel = (
    <ChatPanel
      services={services}
      title={options.title}
      greeting={options.greeting}
      suggestions={options.suggestions}
      accentColor={options.accent}
      focusKey={focusKey}
      getContext={getContext}
      getPage={currentPage}
      dark={dark}
      onToggleTheme={() => store.set({ theme: dark ? "light" : "dark" })}
      onClose={inline ? undefined : () => store.set({ open: false })}
    />
  );

  return (
    <PortalContainerContext.Provider value={portal || undefined}>
      <TooltipProvider>
        <div className={cn("mcp-embed-root", inline && "h-full", dark && "dark")}>
          {inline ? (
            <div className="h-full overflow-hidden">{panel}</div>
          ) : (
            <Floating open={state.open} options={options} onToggle={() => store.set({ open: !state.open })}>
              {started && panel}
            </Floating>
          )}
          {/* Radix popups render here: inside the shadow root, under the .dark class, and above the floating panel. */}
          <div ref={setPortal} className="relative z-[2147483001]" />
        </div>
      </TooltipProvider>
    </PortalContainerContext.Provider>
  );
}

function Floating({ open, options, onToggle, children }) {
  const side = options.position === "left" ? "left-5" : "right-5";
  const Icon = open ? X : MessageCircle;

  return (
    <>
      <div
        role="dialog"
        aria-label={options.title}
        aria-hidden={!open}
        className={cn(
          "fixed bottom-[88px] z-[2147483000] h-[min(680px,calc(100vh-110px))] w-[420px] overflow-hidden rounded-2xl",
          "border bg-background shadow-[0_12px_48px_rgba(0,0,0,0.28)] transition-[opacity,translate,scale] duration-200",
          "max-sm:inset-0 max-sm:h-auto max-sm:w-auto max-sm:rounded-none max-sm:border-0",
          side,
          open ? "opacity-100" : "pointer-events-none translate-y-3 scale-[0.98] opacity-0"
        )}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-label={open ? "Close chat" : "Open chat"}
        style={{ background: options.color }}
        className={cn(
          "fixed bottom-5 z-[2147483000] flex size-14 cursor-pointer items-center justify-center rounded-full border-0",
          "text-white shadow-[0_6px_20px_rgba(0,0,0,0.25)] transition-transform hover:scale-106",
          "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-blue-500/60",
          side,
          open && "max-sm:hidden"
        )}
      >
        <Icon className="size-6" />
      </button>
    </>
  );
}
