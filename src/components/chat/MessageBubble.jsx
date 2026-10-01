import { Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { ToolCallCard } from "./ToolCallCard";

export function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border",
          isUser ? "bg-primary text-primary-foreground" : "bg-card"
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </div>

      <div className={cn("flex min-w-0 max-w-[80%] flex-col gap-2", isUser && "items-end")}>
        {message.toolCalls?.length > 0 && (
          <div className="flex w-full flex-col gap-1.5">
            {message.toolCalls.map((call) => (
              <ToolCallCard key={call.id} call={call} />
            ))}
          </div>
        )}

        <div
          className={cn(
            "max-w-full min-w-0 rounded-2xl px-4 py-2.5 text-sm",
            isUser && "bg-primary text-primary-foreground whitespace-pre-wrap",
            !isUser && !message.error && "border bg-card",
            message.error && "border border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          {isUser ? (
            message.content
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-muted prose-pre:text-foreground prose-table:block prose-table:overflow-x-auto">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "_(empty response)_"}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.model && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="outline" className="font-normal">
              {message.model}
            </Badge>
            {message.usage?.total_tokens > 0 && <span>{message.usage.total_tokens} tokens</span>}
          </div>
        )}
      </div>
    </div>
  );
}
