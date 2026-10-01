import { useCallback, useState } from "react";

let nextId = 1;
const makeId = () => `m${Date.now()}-${nextId++}`;

// `api` is a chatApi from createServices(): the app's default (appServices) or the Shadow DOM embed's own.
export function useChat({ api, onToolsUsed, getContext } = {}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || loading) return;

      const userMsg = { id: makeId(), role: "user", content };
      const history = [...messages.filter((m) => !m.error), userMsg];
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const data = await api.send(
          history.map(({ role, content }) => ({ role, content })),
          getContext?.() || undefined
        );
        setMessages((prev) => [
          ...prev,
          {
            id: makeId(),
            role: "assistant",
            content: data.reply,
            model: data.model,
            toolCalls: data.tool_calls,
            usage: data.usage,
          },
        ]);
        if (data.tool_calls?.length) onToolsUsed?.(data.tool_calls);
      } catch (err) {
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: err.message, error: true }]);
      } finally {
        setLoading(false);
      }
    },
    [messages, loading, onToolsUsed, getContext, api]
  );

  const reset = useCallback(() => setMessages([]), []);

  return { messages, loading, send, reset };
}
