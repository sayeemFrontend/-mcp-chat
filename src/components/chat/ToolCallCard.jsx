import { ChevronRight, CircleAlert, CircleCheck, Wrench } from "lucide-react";
import { useState } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

function pretty(value) {
  if (typeof value !== "string") return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export function ToolCallCard({ call }) {
  const [open, setOpen] = useState(false);
  const StatusIcon = call.is_error ? CircleAlert : CircleCheck;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-muted/40 text-xs">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/70">
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        <Wrench className="size-3.5 text-muted-foreground" />
        <span className="font-mono font-medium">{call.name}</span>
        <span className="truncate text-muted-foreground">
          {Object.entries(call.arguments || {})
            .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
            .join(", ")}
        </span>
        <StatusIcon className={cn("ml-auto size-3.5 shrink-0", call.is_error ? "text-destructive" : "text-emerald-600")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 border-t px-3 py-2">
        <div>
          <div className="mb-1 font-medium text-muted-foreground">Arguments</div>
          <pre className="max-h-48 overflow-auto rounded bg-background p-2 font-mono">{pretty(call.arguments)}</pre>
        </div>
        <div>
          <div className="mb-1 font-medium text-muted-foreground">Result</div>
          <pre className="max-h-72 overflow-auto rounded bg-background p-2 font-mono whitespace-pre-wrap break-words">
            {pretty(call.result)}
          </pre>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
