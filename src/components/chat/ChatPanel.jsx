import { Moon, SquarePen, Sun, X } from "lucide-react";
import { useState } from "react";

import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Button } from "@/components/ui/button";
import { useChat } from "@/hooks/useChat";

// Compact chat without the sidebar: the iframe embed (?embed=1) and the Shadow DOM embed both render this.
// `services` comes from createServices(); `onClose` omitted = no close button (inline embeds).
export function ChatPanel({ services, title = "Assistant", greeting, suggestions, getContext, getPage, dark, onToggleTheme, onClose }) {
  const [input, setInput] = useState("");

  const { messages, loading, send, reset } = useChat({ services, getContext, getPage });

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    send(text);
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{title}</h1>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={reset} aria-label="New chat">
            <SquarePen />
          </Button>
          {onToggleTheme && (
            <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
              {dark ? <Sun /> : <Moon />}
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
              <X />
            </Button>
          )}
        </div>
      </header>

      <MessageList
        messages={messages}
        loading={loading}
        onSuggestion={handleSend}
        greeting={greeting}
        suggestions={suggestions}
      />

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => handleSend()}
        loading={loading}
      />
    </div>
  );
}
