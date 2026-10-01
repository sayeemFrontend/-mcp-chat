"use client";
import { forwardRef as e, useCallback as t, useEffect as n, useImperativeHandle as r, useInsertionEffect as i, useMemo as a, useRef as o, useState as s } from "react";
import { jsx as c, jsxs as l } from "react/jsx-runtime";
//#region ../../src/lib/protocol.js
var u = "mcp-chat:ready", d = "mcp-chat:close", f = "mcp-chat:context", p = "mcp-chat:user", m = "mcp-chat:theme", h = [
	"light",
	"dark",
	"auto"
], g = (e) => h.includes(e) ? e : "auto", _ = (e) => e == null || e === "" ? void 0 : String(e).slice(0, 200);
function v(e) {
	if (!e || typeof e != "object") return null;
	let t = {
		id: _(e.id),
		name: _(e.name),
		email: _(e.email),
		role: _(e.role)
	};
	return t.id || t.name ? t : null;
}
//#endregion
//#region src/ChatWidget.jsx
var y = "mcp-chat-react-styles", b = "\n.mcpcr-launcher{position:fixed;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:9999px;\ncolor:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;\nbox-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease}\n.mcpcr-launcher:hover{transform:scale(1.06)}\n.mcpcr-launcher:focus-visible{outline:3px solid rgba(59,130,246,.6);outline-offset:2px}\n.mcpcr-panel{position:fixed;bottom:88px;z-index:2147483000;width:420px;height:min(680px,calc(100vh - 110px));\nborder-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.28);\nopacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}\n.mcpcr-panel.mcpcr-open{opacity:1;transform:none;pointer-events:auto}\n.mcpcr-right{right:20px}.mcpcr-left{left:20px}\n.mcpcr-panel.mcpcr-dark,.mcpcr-inline.mcpcr-dark{background:#252525}\n@media (prefers-color-scheme:dark){.mcpcr-panel.mcpcr-auto,.mcpcr-inline.mcpcr-auto{background:#252525}}\n.mcpcr-frame{width:100%;height:100%;border:0;display:block}\n.mcpcr-inline{position:relative;width:100%;height:100%;overflow:hidden;background:#fff}\n@media (max-width:520px){.mcpcr-panel{inset:0;width:auto;height:auto;border-radius:0}\n.mcpcr-panel.mcpcr-open~.mcpcr-launcher{display:none}}", x = ({ children: e }) => /* @__PURE__ */ c("svg", {
	width: "24",
	height: "24",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: "2",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": "true",
	children: e
}), S = () => /* @__PURE__ */ c(x, { children: /* @__PURE__ */ c("path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }) }), C = () => /* @__PURE__ */ l(x, { children: [/* @__PURE__ */ c("path", { d: "M18 6 6 18" }), /* @__PURE__ */ c("path", { d: "m6 6 12 12" })] }), w = (...e) => e.filter(Boolean).join(" "), T = e(function({ src: e, title: u, greeting: d, suggestions: h, chatKey: _, tenant: x, context: T, user: E, theme: D = "auto", position: ee = "right", color: te = "#171717", variant: ne = "floating", defaultOpen: re = !1, open: O, onOpenChange: k, onReady: A, className: j, style: M }, N) {
	if (!e) throw Error("<ChatWidget>: the `src` prop (chat app origin) is required");
	let P = ne === "inline", F = ee === "left" ? "left" : "right", I = g(D), L = a(() => v(E), [
		E?.id,
		E?.name,
		E?.email,
		E?.role
	]), R = typeof T == "string" && T ? T : null, z = O !== void 0, [B, V] = s(!!re), H = P || (z ? !!O : B), [U, W] = s(H);
	H && !U && W(!0);
	let G = o(null), K = o(!1), q = o(null);
	q.current = {
		open: H,
		controlled: z,
		onOpenChange: k,
		onReady: A,
		context: R,
		user: L,
		theme: I
	};
	let J = a(() => new URL(e).origin, [e]), Y = Array.isArray(h) ? h.join("|") : "", X = a(() => {
		let t = new URLSearchParams({
			embed: "1",
			theme: q.current.theme
		});
		u && t.set("title", u), d && t.set("greeting", d), Y && t.set("suggestions", Y), P && t.set("closable", "0"), x && t.set("tenant", x);
		let n = new URL(`?${t}`, e.endsWith("/") ? e : `${e}/`);
		return _ && (n.hash = `key=${encodeURIComponent(_)}`), n.toString();
	}, [
		e,
		u,
		d,
		Y,
		P,
		_,
		x
	]), Z = t((e) => {
		let t = G.current?.contentWindow;
		K.current && t && t.postMessage(e, J);
	}, [J]), Q = t((e) => {
		let t = q.current;
		e !== t.open && (t.controlled || V(e), t.onOpenChange?.(e));
	}, []);
	i(() => {
		if (document.getElementById(y)) return;
		let e = document.createElement("style");
		e.id = y, e.textContent = b, document.head.appendChild(e);
	}, []), n(() => {
		K.current = !1;
	}, [X, U]), n(() => {
		let e = (e) => {
			if (e.origin !== J || !G.current || e.source !== G.current.contentWindow) return;
			let t = e.data;
			if (t && typeof t == "object") {
				if (t.type === "mcp-chat:ready") {
					let e = !K.current;
					K.current = !0;
					let { theme: t, user: n, context: r } = q.current;
					Z({
						type: m,
						theme: t
					}), Z({
						type: p,
						user: n
					}), Z({
						type: f,
						context: r
					}), e && q.current.onReady?.();
				} else t.type === "mcp-chat:close" && !P && Q(!1);
			}
		};
		return window.addEventListener("message", e), () => window.removeEventListener("message", e);
	}, [
		J,
		Z,
		Q,
		P
	]), n(() => Z({
		type: f,
		context: R
	}), [Z, R]), n(() => Z({
		type: p,
		user: L
	}), [Z, L]), n(() => Z({
		type: m,
		theme: I
	}), [Z, I]), r(N, () => ({
		open: () => Q(!0),
		close: () => Q(!1),
		toggle: () => Q(!q.current.open)
	}), [Q]);
	let $ = U && /* @__PURE__ */ c("iframe", {
		ref: G,
		className: "mcpcr-frame",
		src: X,
		title: u,
		allow: "clipboard-write"
	});
	return P ? /* @__PURE__ */ c("div", {
		className: w("mcpcr-inline", `mcpcr-${I}`, j),
		style: M,
		"data-mcp-chat": "",
		children: $
	}) : /* @__PURE__ */ l("div", {
		className: j,
		style: M,
		"data-mcp-chat": "",
		children: [/* @__PURE__ */ c("div", {
			className: w("mcpcr-panel", `mcpcr-${F}`, `mcpcr-${I}`, H && "mcpcr-open"),
			role: "dialog",
			"aria-label": u,
			"aria-hidden": !H,
			children: $
		}), /* @__PURE__ */ c("button", {
			type: "button",
			className: w("mcpcr-launcher", `mcpcr-${F}`),
			style: { background: te },
			"aria-label": H ? "Close chat" : "Open chat",
			onClick: () => Q(!H),
			children: c(H ? C : S, {})
		})]
	});
});
//#endregion
export { T as ChatWidget, d as MSG_CLOSE, f as MSG_CONTEXT, u as MSG_READY, m as MSG_THEME, p as MSG_USER };

//# sourceMappingURL=index.js.map