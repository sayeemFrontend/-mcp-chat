import { useCallback, useEffect, useRef, useState } from "react";

import { clientInfo } from "@/lib/clientInfo";

let nextId = 1;
const makeId = () => `m${Date.now()}-${nextId++}`;

const fromStored = (m) => ({ id: makeId(), role: m.role, content: m.content, toolCalls: m.tool_calls || undefined });
const toApi = ({ role, content }) => ({ role, content });

// `services` comes from createServices(): the app's default (appServices) or the Shadow DOM embed's own.
// The LLM server keeps the conversation (a session); this keeps its id, so a page reload continues it.
// `getPage` returns the host page ({ url, title, referrer, viewport }), recorded with a new session.
export function useChat({ services, onToolsUsed, getContext, getPage } = {}) {
  const { chatApi, sessionApi } = services;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef(null);
  // Bumped by reset(), so a reply still on its way to a chat that was left is dropped.
  const generation = useRef(0);

  const remember = useCallback(
    (id) => {
      sessionRef.current = id || null;
      chatApi.saveSession(id);
    },
    [chatApi]
  );

  // Reload the session in progress, unless it is gone or closed (then the next message starts a new one).
  useEffect(() => {
    const id = chatApi.savedSession();
    if (!id) return;
    sessionRef.current = id;
    const gen = generation.current;
    let live = true;
    const current = () => live && gen === generation.current;
    setLoading(true);
    sessionApi
      .get(id)
      .then((s) => {
        if (!current()) return;
        if (s.status === "open") setMessages(s.messages.map(fromStored));
        else remember(null);
      })
      .catch((err) => {
        if (current() && (err.status === 400 || err.status === 404)) remember(null);
      })
      .finally(() => current() && setLoading(false));
    return () => {
      live = false;
    };
  }, [chatApi, sessionApi, remember]);

  const send = useCallback(
    async (text) => {
      const content = text.trim();
      if (!content || loading) return;

      const userMsg = { id: makeId(), role: "user", content };
      const sessionId = sessionRef.current;
      // A session's history is on the server; without one, send what this chat has so far.
      const history = sessionId ? [userMsg] : [...messages.filter((m) => !m.error), userMsg];
      const gen = generation.current;
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const context = getContext?.() || undefined;
        // A new session's first message says what browser and page it starts from.
        const client = () => clientInfo(getPage?.() || null);
        let data;
        try {
          data = await chatApi.send(history.map(toApi), context, sessionId, sessionId ? undefined : client());
        } catch (err) {
          // The session was closed (e.g. in another tab) or is gone: go on in a new one.
          if (!sessionId || (err.status !== 404 && err.status !== 409)) throw err;
          remember(null);
          data = await chatApi.send([toApi(userMsg)], context, null, client());
        }
        if (gen !== generation.current) return;
        remember(data.session_id);
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
        if (gen !== generation.current) return;
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: err.message, error: true }]);
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [messages, loading, onToolsUsed, getContext, getPage, chatApi, remember]
  );

  // New chat: the current session is closed and the next message starts a new one.
  const reset = useCallback(() => {
    generation.current += 1;
    if (sessionRef.current) sessionApi.close(sessionRef.current).catch(() => {});
    remember(null);
    setMessages([]);
    setLoading(false);
  }, [sessionApi, remember]);

  return { messages, loading, send, reset };
}
