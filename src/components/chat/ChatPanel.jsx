import { Bot, Moon, SquarePen, Sun, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

// The tenant's accent color (#rrggbb, admin console) for the visitor's bubbles and the send button, with black or
// white text, whichever reads better on it. Anything else: the theme's primary color.
function accentStyle(color) {
  if (!/^#[0-9a-fA-F]{6}$/.test(color || "")) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const light = 0.299 * r + 0.587 * g + 0.114 * b > 160;
  return { "--chat-accent": color, "--chat-accent-foreground": light ? "#171717" : "#ffffff" };
}

// Focus the input on open, but not on touch screens, where that pops up the keyboard over the chat.
const canAutoFocus = () => !window.matchMedia?.("(pointer: coarse)").matches;

// Compact chat without the sidebar: the iframe embed (?embed=1) and the Shadow DOM embed both render this.
// `services` comes from createServices(); `onClose` omitted = no close button (inline embeds).
// `focusKey`: the input is focused whenever it changes to a truthy value (the chat was opened).
export function ChatPanel({
  services,
  title = "Assistant",
  greeting,
  suggestions,
  accentColor,
  getContext,
  getPage,
  dark,
  onToggleTheme,
  onClose,
  focusKey,
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef(null);

  const { messages, loading, closed, send, retry, reset } = useChat({ services, getContext, getPage });

  useEffect(() => {
    if (focusKey && canAutoFocus()) inputRef.current?.focus({ preventScroll: true });
  }, [focusKey]);

  const handleSend = (text = input) => {
    if (!text.trim() || loading) return;
    send(text);
    setInput("");
    if (canAutoFocus()) inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground" style={accentStyle(accentColor)}>
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--chat-accent,var(--primary))] text-[var(--chat-accent-foreground,var(--primary-foreground))]"
            aria-hidden="true"
          >
            <Bot className="size-4" />
          </div>
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center">
          <Button variant="ghost" size="icon" onClick={reset} aria-label="Start a new chat" title="New chat">
            <SquarePen />
          </Button>
          {onToggleTheme && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              title={dark ? "Light theme" : "Dark theme"}
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat" title="Close">
              <X />
            </Button>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        loading={loading}
        disabled={!!closed}
        onSuggestion={handleSend}
        onRetry={retry}
        greeting={greeting}
        suggestions={suggestions}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        loading={loading}
        closed={closed}
        inputRef={inputRef}
      />
    </div>
  );
}
