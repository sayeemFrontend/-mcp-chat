import { Bot, LoaderCircle, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";

import { MessageBubble } from "./MessageBubble";

// Defaults for hosts that don't pass their own.
const SUGGESTIONS = [
  "What do you offer?",
  "What are your opening hours?",
  "I'd like to book an appointment",
  "Can someone contact me?",
];

export function MessageList({ messages, loading, onSuggestion, greeting, suggestions = SUGGESTIONS }) {
  const viewportRef = useRef(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (!messages.length) {
    return (
      <div className="@container flex min-h-0 flex-1 flex-col items-center justify-center-safe gap-6 overflow-y-auto p-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl border bg-card shadow-sm">
          <Sparkles className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{greeting || "How can we help?"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask a question, book an appointment, or ask to speak with someone.
          </p>
        </div>
        <div className="grid w-full max-w-xl gap-2 @md:grid-cols-2">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggestion(s)}
              className="rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={viewportRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {loading && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex size-8 items-center justify-center rounded-full border bg-card">
              <Bot className="size-4" />
            </div>
            <LoaderCircle className="size-4 animate-spin" />
            Thinking and calling tools...
          </div>
        )}
      </div>
    </div>
  );
}
