import { useCallback, useEffect, useRef, useState } from "react";

import { clientInfo } from "@/lib/clientInfo";
import { describeError } from "@/lib/errors";

let nextId = 1;
const makeId = () => `m${Date.now()}-${nextId++}`;

// Only what the chat shows: the API's tool_calls, model and usage stay in the response (the admin console reads the
// stored tool names) but are never kept here, so no message can render them.
const fromStored = (m) => ({ id: makeId(), role: m.role, content: m.content, at: m.created_at });
const toApi = ({ role, content }) => ({ role, content });
const now = () => new Date().toISOString();

// `services` comes from createServices(): the app's default (appServices) or the Shadow DOM embed's own.
// The LLM server keeps the conversation (a session); this keeps its id, so a page reload continues it.
// `getPage` returns the host page ({ url, title, referrer, viewport }), recorded with a new session.
// A failed message gets an error message after it (`error`, and `retryOf` = the user message to send again);
// `closed` is the text to show instead of the input when this chat can't take messages at all.
export function useChat({ services, getContext, getPage } = {}) {
  const { chatApi, sessionApi } = services;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(null);
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
        if (s.status === "open") setMessages(s.messages.filter((m) => m.content).map(fromStored));
        else remember(null);
      })
      .catch((err) => {
        if (!current()) return;
        if (err.status === 400 || err.status === 404) remember(null);
        const failure = describeError(err);
        if (failure.closed) setClosed(failure.text);
      })
      .finally(() => current() && setLoading(false));
    return () => {
      live = false;
    };
  }, [chatApi, sessionApi, remember]);

  // Sends `userMsg` after the messages in `base` (what the chat shows; the history when there is no session yet).
  const deliver = useCallback(
    async (userMsg, base) => {
      const sessionId = sessionRef.current;
      // A session's history is on the server; without one, send what this chat has so far.
      const history = sessionId ? [userMsg] : [...base.filter((m) => !m.error), userMsg];
      const gen = generation.current;
      setMessages([...base, userMsg]);
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
        setMessages((prev) => [...prev, { id: makeId(), role: "assistant", content: data.reply, at: now() }]);
      } catch (err) {
        if (gen !== generation.current) return;
        console.warn("[mcp-chat] chat request failed:", err.status ?? "", err.message);
        const failure = describeError(err);
        if (failure.closed) {
          setClosed(failure.text);
          return;
        }
        setMessages((prev) => [
          ...prev,
          { id: makeId(), role: "assistant", content: failure.text, error: true, retryOf: failure.retry ? userMsg.id : null },
        ]);
      } finally {
        if (gen === generation.current) setLoading(false);
      }
    },
    [getContext, getPage, chatApi, remember]
  );

  const send = useCallback(
    (text) => {
      const content = text.trim();
      if (!content || loading || closed) return;
      deliver({ id: makeId(), role: "user", content, at: now() }, messages);
    },
    [messages, loading, closed, deliver]
  );

  // Send a failed message again: its error message goes away and the user message moves to the end.
  const retry = useCallback(
    (errorMsg) => {
      if (loading || closed) return;
      const userMsg = messages.find((m) => m.id === errorMsg.retryOf);
      if (!userMsg) return;
      deliver(userMsg, messages.filter((m) => m.id !== errorMsg.id && m.id !== userMsg.id));
    },
    [messages, loading, closed, deliver]
  );

  // New chat: the current session is closed and the next message starts a new one.
  const reset = useCallback(() => {
    generation.current += 1;
    if (sessionRef.current) sessionApi.close(sessionRef.current).catch(() => {});
    remember(null);
    setMessages([]);
    setLoading(false);
  }, [sessionApi, remember]);

  return { messages, loading, closed, send, retry, reset };
}
