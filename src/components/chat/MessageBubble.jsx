import { Bot, CircleAlert, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

// Assistant replies are Markdown. react-markdown never renders raw HTML (no rehype-raw) and drops unsafe URLs
// (javascript: ...); links open in a new tab without access to this window.
const MARKDOWN_COMPONENTS = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

const formatTime = (at) => {
  const date = at ? new Date(at) : null;
  return date && !isNaN(date) ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : null;
};

export function AssistantAvatar() {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-card" aria-hidden="true">
      <Bot className="size-4" />
    </div>
  );
}

// One message as visitors see it: text only (tool calls, model and usage are never shown).
export function MessageBubble({ message, onRetry, retryDisabled }) {
  const isUser = message.role === "user";
  const time = formatTime(message.at);

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && <AssistantAvatar />}

      <div className={cn("flex min-w-0 max-w-[85%] flex-col gap-1", isUser && "items-end")}>
        <div
          className={cn(
            "max-w-full min-w-0 rounded-2xl px-4 py-2.5 text-sm break-words",
            isUser &&
              "rounded-br-md bg-[var(--chat-accent,var(--primary))] text-[var(--chat-accent-foreground,var(--primary-foreground))] whitespace-pre-wrap",
            !isUser && "rounded-bl-md",
            !isUser && !message.error && "border bg-card",
            message.error && "border border-destructive/30 bg-destructive/10 text-foreground"
          )}
        >
          {isUser ? (
            message.content
          ) : message.error ? (
            <div role="alert" className="flex items-start gap-2">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              <span>{message.content}</span>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-pre:bg-muted prose-pre:text-foreground prose-table:block prose-table:overflow-x-auto prose-a:break-words [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>
                {message.content || "Sorry, I don't have an answer for that right now."}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {message.error && message.retryOf && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(message)}
            disabled={retryDisabled}
            className="flex cursor-pointer items-center gap-1 rounded-md px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
            aria-label="Retry sending your message"
          >
            <RotateCcw className="size-3" aria-hidden="true" /> Retry
          </button>
        )}

        {time && !message.error && <time className="px-1 text-[11px] text-muted-foreground">{time}</time>}
      </div>
    </div>
  );
}
