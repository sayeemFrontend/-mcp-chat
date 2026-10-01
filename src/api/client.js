import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// The widget key (X-Chat-Key), created per tenant in the admin console, decides the tenant and the audience:
// a public key (pk_...) = website visitor (intake tools only), a secret key (sk_...) = the tenant's staff.
export const KEY_HEADER = "X-Chat-Key";
// Optional: when sent, the LLM server checks that the key belongs to this tenant.
export const TENANT_HEADER = "X-Tenant-Id";

// One axios instance per LLM server; the Shadow DOM embed creates its own from the host-supplied apiUrl.
export function createApi(baseUrl = API_URL, { chatKey, tenant } = {}) {
  const api = axios.create({
    baseURL: `${baseUrl}/api`,
    timeout: 5 * 60 * 1000, // tool loops can be slow
    headers: { ...(chatKey ? { [KEY_HEADER]: chatKey } : {}), ...(tenant ? { [TENANT_HEADER]: tenant } : {}) },
  });

  // Normalize FastAPI error payloads into a readable message.
  api.interceptors.response.use(
    (res) => res,
    (err) => {
      const detail = err.response?.data?.detail;
      const message =
        (typeof detail === "string" ? detail : detail && JSON.stringify(detail)) ||
        (err.code === "ECONNABORTED" ? "Request timed out." : null) ||
        (!err.response ? `Cannot reach the LLM server at ${baseUrl}.` : err.message);
      return Promise.reject(new Error(message));
    }
  );

  return api;
}
