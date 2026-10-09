"use client";
import { forwardRef as e, useCallback as t, useEffect as n, useImperativeHandle as r, useInsertionEffect as i, useMemo as a, useRef as o, useState as s } from "react";
import { jsx as c, jsxs as l } from "react/jsx-runtime";
//#region ../../src/lib/protocol.js
var u = "mcp-chat:ready", d = "mcp-chat:close", f = "mcp-chat:context", p = "mcp-chat:user", m = "mcp-chat:theme", h = "mcp-chat:page", g = [
	"light",
	"dark",
	"auto"
], ee = (e) => g.includes(e) ? e : "auto", _ = (e) => e == null || e === "" ? void 0 : String(e).slice(0, 200);
function te(e) {
	if (!e || typeof e != "object") return null;
	let t = {
		id: _(e.id),
		name: _(e.name),
		email: _(e.email),
		role: _(e.role)
	};
	return t.id || t.name ? t : null;
}
var v = (e, t) => typeof e == "string" && e ? e.slice(0, t) : void 0, y = (e) => Number.isFinite(e) && e >= 0 ? Math.min(Math.round(e), 1e5) : void 0;
function b(e) {
	if (!e || typeof e != "object") return null;
	let t = {
		url: v(e.url, 2e3),
		title: v(e.title, 300),
		referrer: v(e.referrer, 2e3)
	}, n = e.viewport && {
		width: y(e.viewport.width),
		height: y(e.viewport.height)
	};
	return (n?.width !== void 0 || n?.height !== void 0) && (t.viewport = n), t.url || t.title || t.referrer || t.viewport ? t : null;
}
function x() {
	try {
		return b({
			url: window.location.href,
			title: document.title,
			referrer: document.referrer,
			viewport: {
				width: window.innerWidth,
				height: window.innerHeight
			}
		});
	} catch {
		return null;
	}
}
//#endregion
//#region src/ChatWidget.jsx
var S = "mcp-chat-react-styles", C = "\n.mcpcr-launcher{position:fixed;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:9999px;\ncolor:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;\nbox-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease}\n.mcpcr-launcher:hover{transform:scale(1.06)}\n.mcpcr-launcher:focus-visible{outline:3px solid rgba(59,130,246,.6);outline-offset:2px}\n.mcpcr-panel{position:fixed;bottom:88px;z-index:2147483000;width:420px;height:min(680px,calc(100vh - 110px));\nborder-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.28);\nopacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}\n.mcpcr-panel.mcpcr-open{opacity:1;transform:none;pointer-events:auto}\n.mcpcr-right{right:20px}.mcpcr-left{left:20px}\n.mcpcr-panel.mcpcr-dark,.mcpcr-inline.mcpcr-dark{background:#252525}\n@media (prefers-color-scheme:dark){.mcpcr-panel.mcpcr-auto,.mcpcr-inline.mcpcr-auto{background:#252525}}\n.mcpcr-frame{width:100%;height:100%;border:0;display:block}\n.mcpcr-inline{position:relative;width:100%;height:100%;overflow:hidden;background:#fff}\n@media (max-width:520px){.mcpcr-panel{inset:0;width:auto;height:auto;border-radius:0}\n.mcpcr-panel.mcpcr-open~.mcpcr-launcher{display:none}}", w = ({ children: e }) => /* @__PURE__ */ c("svg", {
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
}), T = () => /* @__PURE__ */ c(w, { children: /* @__PURE__ */ c("path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }) }), ne = () => /* @__PURE__ */ l(w, { children: [/* @__PURE__ */ c("path", { d: "M18 6 6 18" }), /* @__PURE__ */ c("path", { d: "m6 6 12 12" })] }), E = (...e) => e.filter(Boolean).join(" "), D = e(function({ src: e, title: u, greeting: d, suggestions: g, chatKey: _, tenant: v, context: y, user: b, theme: w = "auto", position: D = "right", color: re = "#171717", variant: ie = "floating", defaultOpen: O = !1, open: k, onOpenChange: A, onReady: j, className: M, style: N }, P) {
	if (!e) throw Error("<ChatWidget>: the `src` prop (chat app origin) is required");
	let F = ie === "inline", I = D === "left" ? "left" : "right", L = ee(w), R = a(() => te(b), [
		b?.id,
		b?.name,
		b?.email,
		b?.role
	]), z = typeof y == "string" && y ? y : null, B = k !== void 0, [V, H] = s(!!O), U = F || (B ? !!k : V), [W, ae] = s(U);
	U && !W && ae(!0);
	let G = o(null), K = o(!1), q = o(null);
	q.current = {
		open: U,
		controlled: B,
		onOpenChange: A,
		onReady: j,
		context: z,
		user: R,
		theme: L
	};
	let J = a(() => new URL(e).origin, [e]), Y = Array.isArray(g) ? g.join("|") : "", X = a(() => {
		let t = new URLSearchParams({
			embed: "1",
			theme: q.current.theme
		});
		u && t.set("title", u), d && t.set("greeting", d), Y && t.set("suggestions", Y), F && t.set("closable", "0"), v && t.set("tenant", v);
		let n = new URL(`?${t}`, e.endsWith("/") ? e : `${e}/`);
		return _ && (n.hash = `key=${encodeURIComponent(_)}`), n.toString();
	}, [
		e,
		u,
		d,
		Y,
		F,
		_,
		v
	]), Z = t((e) => {
		let t = G.current?.contentWindow;
		K.current && t && t.postMessage(e, J);
	}, [J]), Q = t((e) => {
		let t = q.current;
		e !== t.open && (t.controlled || H(e), t.onOpenChange?.(e));
	}, []);
	i(() => {
		if (document.getElementById(S)) return;
		let e = document.createElement("style");
		e.id = S, e.textContent = C, document.head.appendChild(e);
	}, []), n(() => {
		K.current = !1;
	}, [X, W]), n(() => {
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
					}), Z({
						type: h,
						page: x()
					}), e && q.current.onReady?.();
				} else t.type === "mcp-chat:close" && !F && Q(!1);
			}
		};
		return window.addEventListener("message", e), () => window.removeEventListener("message", e);
	}, [
		J,
		Z,
		Q,
		F
	]), n(() => Z({
		type: f,
		context: z
	}), [Z, z]), n(() => Z({
		type: p,
		user: R
	}), [Z, R]), n(() => Z({
		type: m,
		theme: L
	}), [Z, L]), n(() => {
		U && Z({
			type: h,
			page: x()
		});
	}, [Z, U]), r(P, () => ({
		open: () => Q(!0),
		close: () => Q(!1),
		toggle: () => Q(!q.current.open)
	}), [Q]);
	let $ = W && /* @__PURE__ */ c("iframe", {
		ref: G,
		className: "mcpcr-frame",
		src: X,
		title: u,
		allow: "clipboard-write"
	});
	return F ? /* @__PURE__ */ c("div", {
		className: E("mcpcr-inline", `mcpcr-${L}`, M),
		style: N,
		"data-mcp-chat": "",
		children: $
	}) : /* @__PURE__ */ l("div", {
		className: M,
		style: N,
		"data-mcp-chat": "",
		children: [/* @__PURE__ */ c("div", {
			className: E("mcpcr-panel", `mcpcr-${I}`, `mcpcr-${L}`, U && "mcpcr-open"),
			role: "dialog",
			"aria-label": u,
			"aria-hidden": !U,
			children: $
		}), /* @__PURE__ */ c("button", {
			type: "button",
			className: E("mcpcr-launcher", `mcpcr-${I}`),
			style: { background: re },
			"aria-label": U ? "Close chat" : "Open chat",
			onClick: () => Q(!U),
			children: c(U ? ne : T, {})
		})]
	});
});
//#endregion
export { D as ChatWidget, d as MSG_CLOSE, f as MSG_CONTEXT, u as MSG_READY, m as MSG_THEME, p as MSG_USER };

//# sourceMappingURL=index.js.map