import { load, save } from "@/lib/storage";

import { API_URL, createApi, rememberVisitor } from "./client";

export function createServices(baseUrl = API_URL, { chatKey, tenant } = {}) {
  const api = createApi(baseUrl, { chatKey, tenant });
  // The conversation in progress, kept per widget key so a page reload continues it.
  const sessionStorageKey = `mcp-chat:session:${chatKey || ""}`;
  const path = (id) => `/sessions/${encodeURIComponent(id)}`;

  return {
    chatApi: {
      // The LLM server always uses LLM_MODEL from its .env; clients don't choose a model. With a session id the
      // server answers from the session's stored history, so only the new message needs sending. `client` (browser
      // info, lib/clientInfo.js) goes with a new session's first message.
      send: (messages, context, sessionId, client) =>
        api.post("/chat", { messages, context, session_id: sessionId || undefined, client }).then((r) => {
          rememberVisitor(r.data.visitor_id);
          return r.data;
        }),
      savedSession: () => load(sessionStorageKey),
      saveSession: (id) => save(sessionStorageKey, id || null),
    },

    // This visitor's chat sessions (only its own, for this widget key's tenant).
    sessionApi: {
      list: () => api.get("/sessions").then((r) => r.data),
      get: (id) => api.get(path(id)).then((r) => r.data),
      close: (id) => api.post(`${path(id)}/close`).then((r) => r.data),
    },

    // Which tenant this widget key belongs to, and its widget settings from the admin console.
    widgetApi: {
      get: () => api.get("/widget").then((r) => r.data),
    },

    modelApi: {
      current: () => api.get("/models").then((r) => r.data),
    },

    toolApi: {
      list: () => api.get("/tools").then((r) => r.data),
    },
  };
}
