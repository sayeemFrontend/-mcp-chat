import { LoaderCircle, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ChatInput({ value, onChange, onSend, loading }) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t bg-background/80 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message… (Enter to send, Shift+Enter for a new line)"
          rows={1}
          className="max-h-48 min-h-9 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
        />

        <Button size="icon" onClick={onSend} disabled={loading || !value.trim()}>
          {loading ? <LoaderCircle className="animate-spin" /> : <SendHorizontal />}
        </Button>
      </div>
    </div>
  );
}
