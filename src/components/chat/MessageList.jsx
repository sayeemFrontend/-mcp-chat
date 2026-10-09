import { Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { AssistantAvatar, MessageBubble } from "./MessageBubble";

// Defaults for hosts that don't pass their own.
const SUGGESTIONS = [
  "What do you offer?",
  "What are your opening hours?",
  "I'd like to book an appointment",
  "Can someone contact me?",
];

// Three bouncing dots while a reply is on its way.
function TypingIndicator() {
  return (
    <div className="flex gap-3" role="status" aria-label="The assistant is typing">
      <AssistantAvatar />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border bg-card px-4 py-3.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MessageList({ messages, loading, onSuggestion, onRetry, disabled, greeting, suggestions = SUGGESTIONS }) {
  const viewportRef = useRef(null);
  const typing = loading && messages.at(-1)?.role === "user";

  // Scroll the list itself (scrollIntoView would also scroll the host page around an inline embed).
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  if (!messages.length) {
    return (
      <div className="@container flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-6 overflow-y-auto p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm" aria-hidden="true">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-balance">{greeting || "How can we help?"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask a question, book an appointment, or ask to speak with someone.
          </p>
        </div>
        {!disabled && suggestions.length > 0 && (
          <div className="grid w-full max-w-xl gap-2 @md:grid-cols-2" role="group" aria-label="Suggested questions">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSuggestion(s)}
                disabled={loading}
                className="cursor-pointer rounded-xl border bg-card px-3.5 py-2.5 text-left text-sm shadow-xs transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Chat messages">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={onRetry} retryDisabled={loading || disabled} />
        ))}
        {typing && <TypingIndicator />}
      </div>
    </div>
  );
}
