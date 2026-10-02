import { Download, File, FileImage, FileText, Trash2 } from "lucide-react";

import { fileApi } from "@/api/appServices";
import { formatBytes } from "@/lib/utils";

// The categories mcp-server reports (its /api/files); anything else gets the plain icon
const ICONS = { document: FileText, pdf: FileText, image: FileImage };

export function FileList({ files, onPick, onDelete }) {
  if (!files.length) {
    return <p className="px-2 py-4 text-center text-xs text-muted-foreground">No files yet. Upload one with the clip icon.</p>;
  }

  return (
    <ul className="space-y-0.5">
      {files.map((f) => {
        const Icon = ICONS[f.category] || File;
        return (
          <li key={f.path} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <button className="min-w-0 flex-1 text-left" onClick={() => onPick(f)} title={`Mention ${f.path} in chat`}>
              <div className="truncate text-sm">{f.path}</div>
              <div className="text-[11px] text-muted-foreground">
                {f.category} · {formatBytes(f.size_bytes)}
              </div>
            </button>
            <a
              href={fileApi.downloadUrl(f.path)}
              className="hidden text-muted-foreground hover:text-foreground group-hover:block"
              title="Download"
            >
              <Download className="size-3.5" />
            </a>
            <button
              onClick={() => onDelete(f)}
              className="hidden text-muted-foreground hover:text-destructive group-hover:block"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
