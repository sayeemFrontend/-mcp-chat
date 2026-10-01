import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { chatApi, fileApi, modelApi, toolApi } from "@/api/appServices";
import { ChatInput } from "@/components/chat/ChatInput";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChat } from "@/hooks/useChat";

import { EmbeddedApp } from "./EmbeddedApp";

// Loaded by widget.js / mcp-chat-react as ?embed=1: compact layout without the sidebar, driven by postMessage.
const EMBED = new URLSearchParams(window.location.search).has("embed");

export default function App() {
  return EMBED ? <EmbeddedApp /> : <StandaloneApp />;
}

function StandaloneApp() {
  const [input, setInput] = useState("");
  const [model, setModel] = useState(null);
  const [tools, setTools] = useState([]);
  const [files, setFiles] = useState([]);
  const [mcpStatus, setMcpStatus] = useState("connecting");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  const flash = (text, error = false) => {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), 4000);
  };

  const loadFiles = useCallback(() => fileApi.list().then((d) => setFiles(d.files)).catch(() => {}), []);

  const { messages, loading, send, reset } = useChat({ api: chatApi });

  useEffect(() => {
    modelApi
      .current()
      .then((d) => {
        setModel(d.model);
        if (d.error) flash(d.error, true);
      })
      .catch((e) => flash(e.message, true));
    toolApi
      .list()
      .then((d) => {
        setTools(d.tools);
        setMcpStatus("up");
      })
      .catch(() => setMcpStatus("down"));
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    send(text);
    setInput("");
  };

  const handleUpload = async (file) => {
    setUploading(true);
    try {
      const saved = await fileApi.upload(file);
      await loadFiles();
      setInput((v) => (v ? `${v} ` : "") + `\`${saved.path}\``);
      flash(`Uploaded ${saved.path}`);
    } catch (e) {
      flash(e.message, true);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm(`Delete ${f.path}?`)) return;
    try {
      await fileApi.remove(f.path);
      await loadFiles();
    } catch (e) {
      flash(e.message, true);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          files={files}
          tools={tools}
          mcpStatus={mcpStatus}
          onNewChat={reset}
          onRefreshFiles={loadFiles}
          onPickFile={(f) => setInput((v) => (v ? `${v} ` : "") + `\`${f.path}\``)}
          onDeleteFile={handleDelete}
        />

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between border-b px-4">
            {/* Read-only: the model is set by LLM_MODEL in llm-server/.env */}
            <div className="min-w-0 text-sm text-muted-foreground" title="Set by LLM_MODEL in llm-server/.env">
              {model ? (
                <>
                  Model <span className="font-mono text-foreground">{model.model}</span> · {model.provider}
                </>
              ) : (
                "Model not configured"
              )}
            </div>
            <div className="flex items-center gap-3">
              {notice && (
                <span className={`text-sm ${notice.error ? "text-destructive" : "text-muted-foreground"}`}>
                  {notice.text}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)}>
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </header>

          <MessageList messages={messages} loading={loading} onSuggestion={handleSend} />

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            onUpload={handleUpload}
            loading={loading}
            uploading={uploading}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}
