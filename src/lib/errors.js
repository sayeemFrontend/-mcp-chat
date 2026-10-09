// What a visitor sees when a request fails. Never the LLM server's or the model provider's own text: that can name
// tools, models or internals. The real error goes to the browser console for developers.

export const ERROR_GENERIC = "Sorry, something went wrong. Please try again.";
export const ERROR_BUSY = "We're getting a lot of messages right now. Please try again in a moment.";
export const ERROR_OFFLINE = "We couldn't connect. Please check your connection and try again.";
export const ERROR_BLOCKED = "Sorry, you can't chat with us here.";
export const ERROR_UNAVAILABLE = "This chat isn't available right now. Please check back later.";

// The llm-server's 403 detail for a visitor the tenant blocked (app/services/sessions.py BLOCKED).
const BLOCKED_DETAIL = "can't chat with us";

// -> { text, retry, closed }: `retry` = the same message may be sent again; `closed` = this chat can't take
// messages at all (blocked visitor, widget turned off, suspended account, unknown key): the input is disabled.
export function describeError(err) {
  const status = err?.status;
  if (status === 403 && String(err.detail || "").includes(BLOCKED_DETAIL)) {
    return { text: ERROR_BLOCKED, retry: false, closed: true };
  }
  if (status === 401 || status === 403) return { text: ERROR_UNAVAILABLE, retry: false, closed: true };
  if (status === 429) return { text: ERROR_BUSY, retry: true, closed: false };
  if (!status && err?.code !== "ECONNABORTED") return { text: ERROR_OFFLINE, retry: true, closed: false };
  return { text: ERROR_GENERIC, retry: true, closed: false };
}
