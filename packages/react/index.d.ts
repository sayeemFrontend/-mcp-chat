import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from "react";

export type ChatTheme = "light" | "dark" | "auto";

export interface ChatUser {
  id: string | number;
  name: string;
  email?: string;
  role?: string;
}

export interface ChatWidgetHandle {
  open(): void;
  close(): void;
  toggle(): void;
}

export interface ChatWidgetProps {
  /** Origin (or base URL) of the deployed chat app, e.g. "http://localhost:5173". */
  src: string;
  /** Header title. Default: the tenant's widget title from the admin console. */
  title?: string;
  /** Heading on the empty chat. */
  greeting?: string;
  /** Starter prompts on the empty chat. */
  suggestions?: string[];
  /** The tenant's widget key from the admin console (required; sent as X-Chat-Key): pk_... on public sites
   * (visitor mode), sk_... for the tenant's staff tools. It decides the tenant. Reloads the iframe. */
  chatKey: string;
  /** Optional tenant id; the key must then belong to that tenant. */
  tenant?: string;
  /** What the user is looking at; sent with every message. Pushed live. */
  context?: string;
  /** The signed-in user; sent to the assistant as context. Pushed live. */
  user?: ChatUser | null;
  /** Default "auto" (follows prefers-color-scheme). Pushed live. */
  theme?: ChatTheme;
  /** Floating variant only. Default "right". */
  position?: "right" | "left";
  /** Launcher background. Default "#171717". */
  color?: string;
  /** "floating" (launcher + panel, default) or "inline" (fills its parent, always open). */
  variant?: "floating" | "inline";
  /** Uncontrolled initial state (floating). */
  defaultOpen?: boolean;
  /** Controlled open state (floating); pair with onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Called when the chat app inside the iframe has loaded (and on every reload of it). */
  onReady?: () => void;
  className?: string;
  style?: CSSProperties;
}

export const ChatWidget: ForwardRefExoticComponent<ChatWidgetProps & RefAttributes<ChatWidgetHandle>>;

export const MSG_READY: "mcp-chat:ready";
export const MSG_CLOSE: "mcp-chat:close";
export const MSG_CONTEXT: "mcp-chat:context";
export const MSG_USER: "mcp-chat:user";
export const MSG_THEME: "mcp-chat:theme";
