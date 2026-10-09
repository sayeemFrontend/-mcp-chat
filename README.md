# MCP Chat widget

The chat UI (React 19 + Vite + Tailwind v4 + shadcn/ui) that talks to the LLM server (`POST /api/chat`). It runs as a
standalone app at `/` and can be put on customer sites in three ways:

| Option | Artifact | Use it when |
| --- | --- | --- |
| **1. Loader + iframe** (recommended default) | `{origin}/widget.js` | Any site, any stack. One script tag, fully isolated (own origin, own CSS/JS), ~3 kB gzip on the host page. |
| **2. React package** | `mcp-chat-react` (`packages/react`) | A React app that wants tighter integration: pass the logged-in user / page context / theme as props, controlled open state, inline placement. Still an iframe underneath. |
| **3. Shadow DOM bundle** (no iframe) | `{origin}/embed.js` | Close interaction with the host page is needed (same document, no frame boundary) and a larger script (~175 kB gzip, includes React) is acceptable. Calls the LLM server directly from the host origin, so that origin must be allowed by CORS. |

`{origin}` is wherever this app is deployed, e.g. `http://localhost:5173`.

### Widget key: which tenant

Every widget needs its tenant's **widget key**, created in the admin console (admin-frontend, Keys): the
`data-key` attribute (loader, Shadow DOM), or the `chatKey` prop (React) / `key` option (`mount()`). It is sent as
the `X-Chat-Key` header. The LLM server looks it up in the platform database, and the key alone decides:

**the tenant** (the MCP tools then see only that tenant's data). Keys are public (`pk_…`) and go on the tenant's
website: the assistant answers from the tenant's profile and the knowledge trained from its files (visitors only
get answers, never the files) and can take leads and appointment requests.

No key, a revoked key, a suspended tenant or a widget turned off in the admin console is refused. A tenant can pin
its keys to its own websites (widget "allowed origins", enforced for the Shadow DOM embed, which calls
the API from the host page). The widget's title, greeting, launcher color and position default to the settings
chosen in the admin console; attributes and props set on the page override them. `data-tenant` / `tenant` are
optional: when set, the key must belong to that tenant.

- **Website:** the key. See `examples/visitor.html`.
- **Iframe (options 1 and 2):** the key travels in the URL fragment (`#key=…`). Browsers never send the fragment to a
  server, and the chat app removes it from its address bar. The embedded chat **never** falls back to the build's
  `VITE_WIDGET_KEY`, so only the host decides the tenant.
- **Standalone app at `/`:** uses `VITE_WIDGET_KEY` from `.env` (dev convenience). Don't set it on a build that is publicly reachable.
- `embed.js` never contains a key; it only sends the one passed to `mount()`.

### Requests, visitor id and session

Every request (all three options) carries `X-Chat-Key` and `X-Visitor-Id`: a random UUID the widget makes up on
first load (`crypto.randomUUID`) and keeps in `localStorage` (`mcp-chat:visitor`; in memory only when storage is
blocked). It identifies the visitor, not the IP address. The LLM server keeps one visitor per tenant for it, so the
same browser on two tenants' sites is two visitors; if it ever answers with another `visitor_id` (ours was missing
or invalid), the widget keeps that one.

The LLM server stores the conversation as a **session**. The first `POST /api/chat` has no `session_id` and
returns one; the widget keeps it per widget key (`mcp-chat:session:<key>`) and sends it with every message, together
with only the new message (the server answers from the stored history). On load it shows the session's messages
again (`GET /api/sessions/{id}`), so a page reload continues the chat. **New chat** closes the session
(`POST /api/sessions/{id}/close`) and forgets its id; the next message starts a new one. A session that is gone
or closed (e.g. from another tab) is forgotten too.

Where it is kept: in options 1 and 2, the chat app's own storage inside the iframe (browsers partition it per
website); in option 3, the host page's `localStorage`.

A new session's first message also carries `client` (in the body, `src/lib/clientInfo.js`): what the browser tells
without asking — `language`, `languages`, `timezone`, `screen` (`width`, `height`, `pixel_ratio`), `viewport`,
`device_type` (mobile / tablet / desktop), `os`, `browser`, `browser_version`, `touch` — and the page the chat starts
on: `page_url`, `page_title`, `referrer`. In options 1 and 2 the host side reports its page (`mcp-chat:page`, below);
without it the iframe falls back to its referrer. Every field is optional. Nothing that needs a permission
(location, notifications) and no fingerprinting (canvas, fonts, audio). The LLM server stores it with the session,
and the device part with the visitor.

### What visitors see

Only the conversation: the visitor's messages and the assistant's replies, rendered as Markdown (lists, bold,
tables, links; links open in a new tab with `rel="noopener noreferrer"`; raw HTML is never rendered). The
assistant's tool calls, the model and token usage are **never shown**, in any of the three options or in the
standalone app's message list. `POST /api/chat` and `GET /api/sessions/{id}` still return `tool_calls` (the admin
console's chat history uses them); the widget just doesn't keep or render them. While a reply is on its way the chat
shows a typing indicator.

Errors never show the server's or the model provider's text (`src/lib/errors.js`; it goes to the browser console):

| What happened | Visitor sees | |
| --- | --- | --- |
| Network down | "We couldn't connect. Please check your connection and try again." | **Retry** on the failed message |
| 429 | "We're getting a lot of messages right now. Please try again in a moment." | **Retry** |
| Anything else (502 from the provider, 5xx, timeout) | "Sorry, something went wrong. Please try again." | **Retry** |
| 403 for a blocked visitor | "Sorry, you can't chat with us here." | input replaced by the message |
| 401 / other 403 (widget turned off, suspended account, unknown key, origin not allowed) | "This chat isn't available right now. Please check back later." | input replaced by the message |

The tenant's accent color (admin console, or `data-color` / `color`) colors the visitor's bubbles, the send button
and the header avatar. The input is focused when the chat opens (not on touch screens); Enter sends, Shift+Enter
adds a line.

---

## 1. Loader + iframe — `widget.js`

```html
<script
  src="http://localhost:5173/widget.js"
  data-title="Firm Assistant"
  data-color="#1e3a8a"
  data-theme="auto"
  data-greeting="How can I help with your matters?"
  data-suggestions="What's on my calendar this week?|Show open matters for Acme Corp"
  defer
></script>
<script>
  window.addEventListener("DOMContentLoaded", () => {
    McpChatWidget.setUser({ id: "u-42", name: "Jane Doe", email: "jane@firm.example", role: "partner" });
    McpChatWidget.setContext("Viewing matter 25-0122 (Acme Corp v. Globex)");
    const off = McpChatWidget.on("open", () => console.log("chat opened"));
  });
</script>
```

It adds a floating launcher; the chat app is loaded lazily in an iframe (`/?embed=1&...`) on first open.
Including the script twice is a no-op. Everything set before the iframe is ready is queued and delivered on `ready`.

### Script attributes

| Attribute | Values | Default |
| --- | --- | --- |
| `data-key` | **required**: the tenant's widget key (`pk_…`) | none |
| `data-title` | header title | the widget's title in the admin console |
| `data-position` | `right` \| `left` | admin console setting |
| `data-color` | launcher background (CSS color); as `#rrggbb` also the chat's accent | admin console accent color |
| `data-theme` | `light` \| `dark` \| `auto` (`auto` = `prefers-color-scheme`) | `auto` |
| `data-open` | `true` opens on load | closed |
| `data-greeting` | heading on the empty chat | generic text |
| `data-suggestions` | starter prompts separated by `\|` | visitor-friendly prompts |
| `data-tenant` | optional tenant id; the key must belong to it | none |

### `window.McpChatWidget`

| Method | Description |
| --- | --- |
| `open()` / `close()` / `toggle()` | Show / hide the panel. |
| `isOpen()` | Current state (addition). |
| `setContext(text \| null)` | What the user is looking at; sent as `context` with every message. |
| `setUser({ id, name, email?, role? } \| null)` | The signed-in user; sent as a `User: Name (role, id …, email)` line at the top of `context`. |
| `setTheme("light" \| "dark" \| "auto")` | Live theme switch (no reload). |
| `on(event, handler)` | `event` = `"ready"` (chat app loaded — only after first open, since the iframe is lazy; subscribing after it happened calls the handler async), `"open"`, `"close"`. Returns an unsubscribe function. |

---

## 2. React package — `mcp-chat-react`

```bash
cd chat-widget/packages/react
npm install
npm run pack        # builds dist/ and writes mcp-chat-react-0.1.0.tgz next to package.json
# in the consuming app:
npm install ./vendor/mcp-chat-react-0.1.0.tgz
```

React/React DOM (>= 18) are peer dependencies. No CSS import is needed (a small `<style>` is injected once). The module
is marked `"use client"` for Next.js. Types: `index.d.ts`.

```jsx
import { useRef } from "react";
import { ChatWidget } from "mcp-chat-react";

export function Assistant({ currentUser, matter }) {
  const chat = useRef(null);
  return (
    <>
      <button onClick={() => chat.current.open()}>Ask the assistant</button>
      <ChatWidget
        ref={chat}
        src="http://localhost:5173"
        title="Firm Assistant"
        user={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
        context={matter ? `Viewing matter ${matter.number} (${matter.title})` : undefined}
        theme="auto"
      />
    </>
  );
}

// Inline: fills its parent, no launcher, always open
<div style={{ height: 600 }}>
  <ChatWidget src="http://localhost:5173" variant="inline" />
</div>
```

### Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `src` | `string` | — (required) | Chat app origin / base URL. |
| `title` | `string` | `"Assistant"` | Reloads the iframe when changed. |
| `greeting` | `string` | | Reloads the iframe when changed. |
| `suggestions` | `string[]` | | Reloads the iframe when changed. |
| `chatKey` | `string` | — (required) | The tenant's widget key (`pk_…`). Reloads the iframe when changed. |
| `tenant` | `string` | | Optional tenant id; the key must belong to it. |
| `context` | `string` | | Pushed live. |
| `user` | `{ id, name, email?, role? } \| null` | | Pushed live. |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Pushed live. |
| `position` | `"right" \| "left"` | `"right"` | Floating only. |
| `color` | `string` | `"#171717"` | Launcher background. |
| `variant` | `"floating" \| "inline"` | `"floating"` | Inline hides the close button inside the chat. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled. |
| `open` / `onOpenChange(open)` | `boolean` / `fn` | | Controlled mode. `onOpenChange` also fires in uncontrolled mode. |
| `onReady` | `() => void` | | Addition: the iframe app loaded. |
| `className` / `style` | | | Applied to the root element. |

Ref methods: `open()`, `close()`, `toggle()`. The package also exports the protocol constants (`MSG_READY`, …).

---

## 3. Shadow DOM bundle — `embed.js`

```html
<script src="http://localhost:5173/embed.js"></script>
<script>
  const chat = McpChatEmbed.mount({
    apiUrl: "http://localhost:8000",
    title: "Firm Assistant",
    user: { id: "u-42", name: "Jane Doe", role: "partner" },
    context: "Viewing the dashboard",
  });
  // later
  chat.setContext("Viewing matter 25-0122");
  chat.open();

  // A second, independent instance rendered inline
  McpChatEmbed.mount({ apiUrl: "http://localhost:8000", variant: "inline", target: "#assistant", theme: "dark" });
</script>

<!-- or without any code -->
<script
  src="http://localhost:5173/embed.js"
  data-auto-mount="true"
  data-api-url="http://localhost:8000"
  data-title="Firm Assistant"
  data-user='{"id":"u-42","name":"Jane Doe"}'
></script>
```

Loading the script only defines `window.McpChatEmbed` unless the tag has `data-auto-mount="true"` (then the instance
is at `McpChatEmbed.autoMounted`). Including it twice is a no-op. Each `mount()` gets its own shadow root
(`<mcp-chat-embed>` element), state and conversation.

### `McpChatEmbed.mount(options)` → instance

| Option | data-* (auto-mount) | Default | Notes |
| --- | --- | --- | --- |
| `apiUrl` | `data-api-url` | — (required) | LLM server base URL. |
| `variant` | `data-variant` | `"floating"` | `"inline"` fills `target`. |
| `target` | `data-target` | | Element or selector; required for inline. |
| `title` | `data-title` | admin console title | |
| `greeting` | `data-greeting` | | |
| `suggestions` | `data-suggestions` (`a\|b`) | | `string[]` |
| `key` | `data-key` | — (required) | The tenant's widget key (`X-Chat-Key`), `pk_…`. |
| `tenant` | `data-tenant` | | Optional tenant id; the key must belong to it. |
| `context` | `data-context` | | |
| `user` | `data-user` (JSON) | | `{ id, name, email?, role? }` |
| `theme` | `data-theme` | `"auto"` | |
| `position` | `data-position` | `"right"` | |
| `color` | `data-color` | `"#171717"` | |
| `defaultOpen` | `data-default-open` / `data-open` | `false` | |

Instance: `open()`, `close()`, `toggle()`, `isOpen()`, `setContext(text)`, `setUser(user | null)`,
`setTheme(theme)`, `unmount()`. Globals: `McpChatEmbed.version`, `McpChatEmbed.instances()`.

How isolation is handled:

- All CSS lives in the shadow root (one shared constructed stylesheet); host rules can't reach in and ours can't leak out.
- `:host { all: initial !important }` plus an explicit base font/size/line-height/color stops inherited host styles.
  All `rem` values are rewritten to `px` (16px base), so a host `html { font-size: 62.5% }` doesn't shrink the UI.
- Theme variables are declared on `:root, :host` (Tailwind's own theme layer already does this).
- `@property` rules are ignored inside shadow roots, which breaks Tailwind shadows/rings/transforms; the bundle copies
  those `@property` registrations into `document.head` once (`<style id="mcp-chat-embed-properties">`). They only give
  Tailwind's internal `--tw-*` variables initial values.
- Radix portals (tooltips) render into a container inside the shadow root instead of `document.body`.

The embed talks to the LLM server with the host page's origin, so that origin must be in the LLM server's
`CORS_ORIGINS` (`docker-compose.yml` / `llm-server/.env`): `http://localhost:5173` and `http://localhost:5174` are listed.

---

## postMessage protocol (options 1 and 2)

Constants live in `src/lib/protocol.js` (bundled into the React package); `public/widget.js` duplicates the strings.

| Direction | `type` | Payload |
| --- | --- | --- |
| iframe → host | `mcp-chat:ready` | — (sent on load; host answers with theme, user, context and page) |
| iframe → host | `mcp-chat:close` | — (close button in the chat header) |
| host → iframe | `mcp-chat:context` | `{ context: string \| null }` (truncated to 2000 chars) |
| host → iframe | `mcp-chat:user` | `{ user: { id, name, email?, role? } \| null }` (only these fields are kept) |
| host → iframe | `mcp-chat:theme` | `{ theme: "light" \| "dark" \| "auto" }` |
| host → iframe | `mcp-chat:page` | `{ page: { url, title, referrer, viewport: { width, height } } }` (the host page; also re-sent on open) |

Checks: the host only accepts messages whose `origin` is the chat origin **and** whose `source` is its own iframe,
and posts with the chat origin as `targetOrigin`. The chat app only accepts messages whose `source` is
`window.parent`; optionally restrict host origins at build time with `VITE_EMBED_ALLOWED_ORIGINS`
(comma-separated). The app posts `ready`/`close` with `"*"` since they carry no data. Host state is re-sent on every
`ready`, so an iframe reload loses nothing.

Iframe URL: `/?embed=1&title=…&greeting=…&suggestions=a|b&color=…&theme=…[&closable=0]`. The host focuses the
iframe when the chat opens (the app then focuses its input) and its launcher when the chat closes with focus inside.

What reaches the LLM: `context` = `"User: Jane Doe (partner, id u-42, jane@firm.example)\n<page context>"`, cut to
2000 characters (the llm-server limit). The user line comes first, so only page context is ever truncated.

---

## CORS / CSP notes for customer sites

| Option | Host page CSP needs | Other |
| --- | --- | --- |
| widget.js | `script-src {origin}`; `frame-src {origin}` | The iframe calls the LLM server from `{origin}` (already allowed). |
| React package | `frame-src {origin}` | Same as above. |
| embed.js | `script-src {origin}`; `connect-src {apiUrl}`; `style-src 'unsafe-inline'` may be needed if you restrict styles (the bundle injects one `<style>` for `@property`) | Host origin must be in the LLM server `CORS_ORIGINS`. |

On the chat side, restrict who may frame the app with `Content-Security-Policy: frame-ancestors …` in `nginx.conf` if
needed (none is set today). nginx serves `/widget.js` and `/embed.js` (also `/v1/widget.js`, `/v1/embed.js`) with
`Access-Control-Allow-Origin: *` and a 5-minute cache; hashed `/assets/*` are cached for a year.

---

## Build & develop

```bash
npm install
npm run dev          # app + HMR on :5173 (serves public/widget.js; /embed.js comes from dev:embed)
npm run dev:embed    # watch build of the Shadow DOM bundle -> .embed-dev/embed.js, served at /embed.js
npm run build        # dist/: the app, widget.js and embed.js (vite.config.js, then vite.embed.config.js)

cd packages/react && npm install && npm run pack   # dist/ + mcp-chat-react-0.1.0.tgz
```

Docker dev (`docker-compose.dev.yml`) runs `dev:embed` and the dev server together in the `chat-widget` container.
The production image serves `dist/` with nginx.

Test pages in `examples/` (open through the dev server, e.g. `http://localhost:5173/examples/embed.html`):
`loader.html` (also works from another origin, e.g. `python -m http.server 5180 -d examples`), `react.html` (uses
the built `packages/react/dist`), `embed.html` (floating + inline mounts on a deliberately hostile page).
