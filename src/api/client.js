import axios from "axios";

import { isUuid, load, randomUuid, save } from "@/lib/storage";

export const API_URL = import.meta.env.VITE_CHAT_API_URL || "http://localhost:8000";

// The widget key (X-Chat-Key, pk_...), created per tenant in the admin console, decides the tenant.
export const KEY_HEADER = "X-Chat-Key";
// Optional: when sent, the LLM server checks that the key belongs to this tenant.
export const TENANT_HEADER = "X-Tenant-Id";
// Who is chatting: a random id made on first load and kept in this browser (never the IP address). The LLM server
// keeps one visitor per tenant for it, with the visitor's chat sessions.
export const VISITOR_HEADER = "X-Visitor-Id";
const VISITOR_STORAGE = "mcp-chat:visitor";

export function visitorId() {
  let id = load(VISITOR_STORAGE);
  if (!isUuid(id)) {
    id = randomUuid();
    save(VISITOR_STORAGE, id);
  }
  return id;
}

// The server makes up an id when ours was missing or invalid, and returns it: keep that one.
export function rememberVisitor(id) {
  if (isUuid(id) && id !== load(VISITOR_STORAGE)) save(VISITOR_STORAGE, id);
}

// One axios instance per LLM server; the Shadow DOM embed creates its own from the host-supplied apiUrl.
export function createApi(baseUrl = API_URL, { chatKey, tenant } = {}) {
  const api = axios.create({
    baseURL: `${baseUrl}/api`,
    timeout: 5 * 60 * 1000, // tool loops can be slow
    headers: { ...(chatKey ? { [KEY_HEADER]: chatKey } : {}), ...(tenant ? { [TENANT_HEADER]: tenant } : {}) },
  });

  // Read on every request, so an id the server handed back is used from then on.
  api.interceptors.request.use((config) => {
    config.headers[VISITOR_HEADER] = visitorId();
    return config;
  });

  // Normalize FastAPI error payloads into a readable message (keeping the HTTP status).
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      const detail = err.response?.data?.detail;
      const message =
        (typeof detail === "string" ? detail : detail && JSON.stringify(detail)) ||
        (err.code === "ECONNABORTED" ? "Request timed out." : null) ||
        (!err.response ? `Cannot reach the LLM server at ${baseUrl}.` : err.message);
      return Promise.reject(Object.assign(new Error(message), { status: err.response?.status }));
    }
  );

  return api;
}
