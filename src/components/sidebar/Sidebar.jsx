import { Hammer, RefreshCw, SquarePen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { FileList } from "./FileList";

export function Sidebar({ files, tools, mcpStatus, onNewChat, onRefreshFiles, onPickFile, onDeleteFile }) {
  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex items-center justify-between p-4">
        <div>
          <h1 className="font-semibold">MCP Chat</h1>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`size-2 rounded-full ${mcpStatus === "up" ? "bg-emerald-500" : "bg-red-500"}`} />
            MCP server {mcpStatus}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onNewChat}>
          <SquarePen /> New
        </Button>
      </div>
      <Separator />

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Files ({files.length})</span>
        <Button variant="ghost" size="icon" className="size-7" onClick={onRefreshFiles}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        <FileList files={files} onPick={onPickFile} onDelete={onDeleteFile} />
      </div>

      <Separator />
      <div className="p-4">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <Hammer className="size-3.5" /> MCP tools ({tools.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {tools.map((t) => (
            <Tooltip key={t.name}>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="cursor-default font-mono font-normal">
                  {t.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="top">{t.description}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </aside>
  );
}
