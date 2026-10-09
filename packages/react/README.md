# mcp-chat-react

React component that embeds the MCP Chat assistant (iframe + postMessage).

```bash
npm install mcp-chat-react
```

React/React DOM (>= 18) are peer dependencies. No CSS import is needed (a small `<style>` is injected once). The module
is marked `"use client"` for Next.js. Types are included.

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
        src="https://chat.example.com"
        chatKey="pk_..."
        title="Firm Assistant"
        user={{ id: currentUser.id, name: currentUser.name, role: currentUser.role }}
        context={matter ? `Viewing matter ${matter.number} (${matter.title})` : undefined}
        theme="auto"
      />
    </>
  );
}

// No chatKey: the public assistant (everyday questions from open data: weather, time, places, Wikipedia…)
<ChatWidget src="https://chat.example.com" />

// Inline: fills its parent, no launcher, always open
<div style={{ height: 600 }}>
  <ChatWidget src="https://chat.example.com" chatKey="pk_..." variant="inline" />
</div>
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `src` | `string` | — (required) | Chat app origin / base URL. |
| `chatKey` | `string` | | The tenant's widget key (`pk_…`). Without it the chat is the public assistant (general questions, open data). Reloads the iframe when changed. |
| `tenant` | `string` | | Optional tenant id; the key must belong to it. |
| `title` | `string` | `"Assistant"` | Reloads the iframe when changed. |
| `greeting` | `string` | | Reloads the iframe when changed. |
| `suggestions` | `string[]` | | Reloads the iframe when changed. |
| `context` | `string` | | Pushed live. |
| `user` | `{ id, name, email?, role? } \| null` | | Pushed live. |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Pushed live. |
| `position` | `"right" \| "left"` | `"right"` | Floating only. |
| `color` | `string` | `"#171717"` | Launcher background. |
| `variant` | `"floating" \| "inline"` | `"floating"` | Inline hides the close button inside the chat. |
| `defaultOpen` | `boolean` | `false` | Uncontrolled. |
| `open` / `onOpenChange(open)` | `boolean` / `fn` | | Controlled mode. `onOpenChange` also fires in uncontrolled mode. |
| `onReady` | `() => void` | | The iframe app loaded. |
| `className` / `style` | | | Applied to the root element. |

Ref methods: `open()`, `close()`, `toggle()`. The package also exports the protocol constants (`MSG_READY`, …).

If your page sets a Content-Security-Policy, allow the chat origin in `frame-src`.

## License

MIT
