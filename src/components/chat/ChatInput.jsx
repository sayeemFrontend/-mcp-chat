import { LoaderCircle, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

// Enter sends, Shift+Enter starts a new line. `closed`: this chat can't take messages (a polite reason is shown
// instead of the input).
export function ChatInput({ value, onChange, onSend, loading, closed, inputRef }) {
  const handleKeyDown = (e) => {
    // Not while an IME composition (e.g. Japanese input) is being confirmed with Enter.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!loading) onSend();
    }
  };

  if (closed) {
    return (
      <div className="border-t bg-background/80 p-4 backdrop-blur">
        <p role="status" className="mx-auto max-w-3xl rounded-2xl border bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          {closed}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t bg-background/80 p-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-1.5 pl-2 shadow-sm focus-within:ring-[3px] focus-within:ring-ring/30">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message…"
          aria-label="Message"
          rows={1}
          className="max-h-32 min-h-9 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
        />

        <Button
          size="icon"
          onClick={onSend}
          disabled={loading || !value.trim()}
          aria-label={loading ? "Sending…" : "Send message"}
          className="shrink-0 rounded-xl bg-[var(--chat-accent,var(--primary))] text-[var(--chat-accent-foreground,var(--primary-foreground))] hover:bg-[var(--chat-accent,var(--primary))] hover:opacity-90"
        >
          {loading ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </div>
    </div>
  );
}
