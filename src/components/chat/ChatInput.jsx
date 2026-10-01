import { LoaderCircle, Paperclip, SendHorizontal } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function ChatInput({ value, onChange, onSend, onUpload, loading, uploading }) {
  const fileRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="border-t bg-background/80 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <LoaderCircle className="animate-spin" /> : <Paperclip />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upload a document or media file</TooltipContent>
        </Tooltip>

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
