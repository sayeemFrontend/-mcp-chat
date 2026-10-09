// localStorage with an in-memory fallback: access throws in some sandboxed frames, private modes and with site data
// blocked, and the chat must still work then (it just forgets on reload). In the iframe embeds this is the chat
// app's own storage (browsers partition it per website); in the Shadow DOM embed it is the host page's.
const memory = new Map();

export function load(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    // unavailable: the in-memory copy below
  }
  return memory.get(key) ?? null;
}

// null / undefined removes the value.
export function save(key, value) {
  if (value == null) memory.delete(key);
  else memory.set(key, value);
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // unavailable: kept in memory only
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => typeof value === "string" && UUID.test(value);

// crypto.randomUUID needs a secure context (https or localhost); the Shadow DOM embed may run on a plain http page.
export function randomUuid() {
  if (globalThis.crypto?.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // not a secure context: build one below
    }
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
