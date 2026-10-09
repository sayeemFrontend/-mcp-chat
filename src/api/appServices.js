import { API_URL } from "./client";
import { createServices } from "./services";

// Default services for this build (the standalone app and the iframe embed). Kept out of services.js so the
// Shadow DOM bundle, which builds its own from host options, never includes this module or VITE_WIDGET_KEY.
//
// The widget key decides the tenant on the LLM server. In the iframe embed the host passes
// it in the URL fragment (#key=..., never sent to a server); it is removed from the address bar right away.
// Only the standalone app falls back to VITE_WIDGET_KEY.
function chatKey() {
  const embedded = new URLSearchParams(window.location.search).has("embed");
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const key = hash.get("key");
  if (key) {
    hash.delete("key");
    const rest = hash.toString();
    window.history.replaceState(null, "", window.location.pathname + window.location.search + (rest ? `#${rest}` : ""));
  }
  if (embedded) return key || undefined;
  return key || import.meta.env.VITE_WIDGET_KEY || undefined;
}

// Optional tenant check: a host may also pass ?tenant=...; the LLM server then refuses a key of another tenant.
function tenantId() {
  return new URLSearchParams(window.location.search).get("tenant") || undefined;
}

export const services = createServices(API_URL, { chatKey: chatKey(), tenant: tenantId() });
export const { chatApi, modelApi, toolApi } = services;
