import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { modelApi, services, toolApi } from "@/api/appServices";
import { ChatInput } from "@/components/chat/ChatInput";
import { KeylessBanner } from "@/components/chat/KeylessBanner";
import { MessageList } from "@/components/chat/MessageList";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useChat } from "@/hooks/useChat";
import { currentPage } from "@/lib/protocol";

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
  const [mcpStatus, setMcpStatus] = useState("connecting");
  const [notice, setNotice] = useState(null);
  const [dark, setDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  const flash = (text, error = false) => {
    setNotice({ text, error });
    setTimeout(() => setNotice(null), 4000);
  };

  // Same messages as visitors see (no tool calls inline); the sidebar lists the MCP tools for developers.
  const { messages, loading, closed, send, retry, reset } = useChat({ services, getPage: currentPage });

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
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const handleSend = (text = input) => {
    if (!text.trim() || loading) return;
    send(text);
    setInput("");
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar tools={tools} mcpStatus={mcpStatus} onNewChat={reset} />

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
              <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} aria-label="Toggle theme">
                {dark ? <Sun /> : <Moon />}
              </Button>
            </div>
          </header>

          <KeylessBanner services={services} />

          <MessageList
            messages={messages}
            loading={loading}
            disabled={!!closed}
            onSuggestion={handleSend}
            onRetry={retry}
          />

          <ChatInput
            value={input}
            onChange={setInput}
            onSend={() => handleSend()}
            loading={loading}
            closed={closed}
          />
        </main>
      </div>
    </TooltipProvider>
  );
}
