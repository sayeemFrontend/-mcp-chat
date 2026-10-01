# MCP Chat widget

The chat UI (React 19 + Vite + Tailwind v4 + shadcn/ui) that talks to the LLM server (`POST /api/chat`). It runs as a
standalone app at `/` and can be put on customer sites in three ways:

| Option | Artifact | Use it when |
| --- | --- | --- |
| **1. Loader + iframe** (recommended default) | `{origin}/widget.js` | Any site, any stack. One script tag, fully isolated (own origin, own CSS/JS), ~3 kB gzip on the host page. |
| **2. React package** | `mcp-chat-react` (`packages/react`) | A React app that wants tighter integration: pass the logged-in user / page context / theme as props, controlled open state, inline placement. Still an iframe underneath. |
| **3. Shadow DOM bundle** (no iframe) | `{origin}/embed.js` | Close interaction with the host page is needed (same document, no frame boundary) and a larger script (~175 kB gzip, includes React) is acceptable. Calls the LLM server directly from the host origin, so that origin must be allowed by CORS. |

`{origin}` is wherever this app is deployed, e.g. `http://localhost:5173`.

### Widget key: which tenant, and staff vs. website visitor

Every widget needs its tenant's **widget key**, created in the admin console (admin-frontend, Keys): the
`data-key` attribute (loader, Shadow DOM), or the `chatKey` prop (React) / `key` option (`mount()`). It is sent as
the `X-Chat-Key` header. The LLM server looks it up in the platform database, and the key alone decides:

- **the tenant**: the MCP tools then see only that tenant's data;
- **the audience**: a **public key** (`pk_…`) = website visitor. The assistant sees only the data the tenant made
  public (its profile, public collections and knowledge) and can take leads and appointment requests. A
  **secret key** (`sk_…`) = the tenant's staff: it also sees staff-only data, leads and appointments.

No key, a revoked key, a suspended tenant or a widget turned off in the admin console is refused. A tenant can pin
its public keys to its own websites (widget "allowed origins", enforced for the Shadow DOM embed, which calls
the API from the host page). The widget's title, greeting, launcher color and position default to the settings
chosen in the admin console; attributes and props set on the page override them. `data-tenant` / `tenant` are
optional: when set, the key must belong to that tenant.

- **Public website:** the public key. See `examples/visitor.html`.
- **Internal staff app:** the secret key. Treat it like a password; it is visible to anyone who can load that page.
- **Iframe (options 1 and 2):** the key travels in the URL fragment (`#key=…`). Browsers never send the fragment to a
  server, and the chat app removes it from its address bar. The embedded chat **never** falls back to the build's
  `VITE_CHAT_KEY`, so only the host can grant staff access.
- **Standalone app at `/`:** uses `VITE_CHAT_KEY` from `.env` (dev convenience). Don't set it on a build that is publicly reachable.
- `embed.js` never contains a key; it only sends the one passed to `mount()`.

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
| `data-key` | **required**: the tenant's widget key (`pk_…` public site, `sk_…` staff) | none |
| `data-title` | header title | the widget's title in the admin console |
| `data-position` | `right` \| `left` | admin console setting |
| `data-color` | launcher background (CSS color) | admin console accent color |
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
| `chatKey` | `string` | — (required) | The tenant's widget key (`pk_…` / `sk_…`). Reloads the iframe when changed. |
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
| `key` | `data-key` | — (required) | The tenant's widget key (`X-Chat-Key`): `pk_…` visitor, `sk_…` staff. |
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
| iframe → host | `mcp-chat:ready` | — (sent on load; host answers with theme, user and context) |
| iframe → host | `mcp-chat:close` | — (close button in the chat header) |
| host → iframe | `mcp-chat:context` | `{ context: string \| null }` (truncated to 2000 chars) |
| host → iframe | `mcp-chat:user` | `{ user: { id, name, email?, role? } \| null }` (only these fields are kept) |
| host → iframe | `mcp-chat:theme` | `{ theme: "light" \| "dark" \| "auto" }` |

Checks: the host only accepts messages whose `origin` is the chat origin **and** whose `source` is its own iframe,
and posts with the chat origin as `targetOrigin`. The chat app only accepts messages whose `source` is
`window.parent`; optionally restrict host origins at build time with `VITE_EMBED_ALLOWED_ORIGINS`
(comma-separated). The app posts `ready`/`close` with `"*"` since they carry no data. Host state is re-sent on every
`ready`, so an iframe reload loses nothing.

Iframe URL: `/?embed=1&title=…&greeting=…&suggestions=a|b&theme=…[&closable=0]`.

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
