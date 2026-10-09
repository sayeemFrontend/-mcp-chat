"use client";
import { forwardRef as e, useCallback as t, useEffect as n, useImperativeHandle as r, useInsertionEffect as ee, useMemo as i, useRef as a, useState as o } from "react";
import { jsx as s, jsxs as c } from "react/jsx-runtime";
//#region ../../src/lib/protocol.js
var l = "mcp-chat:ready", u = "mcp-chat:close", d = "mcp-chat:context", f = "mcp-chat:user", p = "mcp-chat:theme", m = "mcp-chat:page", h = [
	"light",
	"dark",
	"auto"
], te = (e) => h.includes(e) ? e : "auto", g = (e) => e == null || e === "" ? void 0 : String(e).slice(0, 200);
function ne(e) {
	if (!e || typeof e != "object") return null;
	let t = {
		id: g(e.id),
		name: g(e.name),
		email: g(e.email),
		role: g(e.role)
	};
	return t.id || t.name ? t : null;
}
var _ = (e, t) => typeof e == "string" && e ? e.slice(0, t) : void 0, v = (e) => Number.isFinite(e) && e >= 0 ? Math.min(Math.round(e), 1e5) : void 0;
function y(e) {
	if (!e || typeof e != "object") return null;
	let t = {
		url: _(e.url, 2e3),
		title: _(e.title, 300),
		referrer: _(e.referrer, 2e3)
	}, n = e.viewport && {
		width: v(e.viewport.width),
		height: v(e.viewport.height)
	};
	return (n?.width !== void 0 || n?.height !== void 0) && (t.viewport = n), t.url || t.title || t.referrer || t.viewport ? t : null;
}
function b() {
	try {
		return y({
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
var x = "mcp-chat-react-styles", S = "\n.mcpcr-launcher{position:fixed;bottom:20px;z-index:2147483000;width:56px;height:56px;border:0;border-radius:9999px;\ncolor:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;\nbox-shadow:0 6px 20px rgba(0,0,0,.25);transition:transform .15s ease}\n.mcpcr-launcher:hover{transform:scale(1.06)}\n.mcpcr-launcher:focus-visible{outline:3px solid rgba(59,130,246,.6);outline-offset:2px}\n.mcpcr-panel{position:fixed;bottom:88px;z-index:2147483000;width:420px;height:min(680px,calc(100vh - 110px));\nborder-radius:16px;overflow:hidden;background:#fff;box-shadow:0 12px 48px rgba(0,0,0,.28);\nopacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .18s ease,transform .18s ease}\n.mcpcr-panel.mcpcr-open{opacity:1;transform:none;pointer-events:auto}\n.mcpcr-right{right:20px}.mcpcr-left{left:20px}\n.mcpcr-panel.mcpcr-dark,.mcpcr-inline.mcpcr-dark{background:#252525}\n@media (prefers-color-scheme:dark){.mcpcr-panel.mcpcr-auto,.mcpcr-inline.mcpcr-auto{background:#252525}}\n.mcpcr-frame{width:100%;height:100%;border:0;display:block}\n.mcpcr-inline{position:relative;width:100%;height:100%;overflow:hidden;background:#fff}\n@media (max-width:520px){.mcpcr-panel{inset:0;width:auto;height:auto;border-radius:0}\n.mcpcr-panel.mcpcr-open~.mcpcr-launcher{display:none}}", C = ({ children: e }) => /* @__PURE__ */ s("svg", {
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
}), w = () => /* @__PURE__ */ s(C, { children: /* @__PURE__ */ s("path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z" }) }), re = () => /* @__PURE__ */ c(C, { children: [/* @__PURE__ */ s("path", { d: "M18 6 6 18" }), /* @__PURE__ */ s("path", { d: "m6 6 12 12" })] }), T = (...e) => e.filter(Boolean).join(" "), E = e(function({ src: e, title: l, greeting: u, suggestions: h, chatKey: g, tenant: _, context: v, user: y, theme: C = "auto", position: E = "right", color: ie = "#171717", variant: D = "floating", defaultOpen: O = !1, open: k, onOpenChange: A, onReady: j, className: M, style: N }, P) {
	if (!e) throw Error("<ChatWidget>: the `src` prop (chat app origin) is required");
	let F = D === "inline", I = E === "left" ? "left" : "right", L = te(C), R = i(() => ne(y), [
		y?.id,
		y?.name,
		y?.email,
		y?.role
	]), z = typeof v == "string" && v ? v : null, B = k !== void 0, [ae, oe] = o(!!O), V = F || (B ? !!k : ae), [H, se] = o(V);
	V && !H && se(!0);
	let U = a(null), W = a(!1), G = a(null);
	G.current = {
		open: V,
		controlled: B,
		onOpenChange: A,
		onReady: j,
		context: z,
		user: R,
		theme: L
	};
	let K = i(() => new URL(e).origin, [e]), q = Array.isArray(h) ? h.join("|") : "", J = i(() => {
		let t = new URLSearchParams({
			embed: "1",
			theme: G.current.theme
		});
		l && t.set("title", l), u && t.set("greeting", u), q && t.set("suggestions", q), F && t.set("closable", "0"), _ && t.set("tenant", _);
		let n = new URL(`?${t}`, e.endsWith("/") ? e : `${e}/`);
		return g && (n.hash = `key=${encodeURIComponent(g)}`), n.toString();
	}, [
		e,
		l,
		u,
		q,
		F,
		g,
		_
	]), Y = t((e) => {
		let t = U.current?.contentWindow;
		W.current && t && t.postMessage(e, K);
	}, [K]), X = t((e) => {
		let t = G.current;
		e !== t.open && (t.controlled || oe(e), t.onOpenChange?.(e));
	}, []);
	ee(() => {
		if (document.getElementById(x)) return;
		let e = document.createElement("style");
		e.id = x, e.textContent = S, document.head.appendChild(e);
	}, []), n(() => {
		W.current = !1;
	}, [J, H]), n(() => {
		let e = (e) => {
			if (e.origin !== K || !U.current || e.source !== U.current.contentWindow) return;
			let t = e.data;
			if (t && typeof t == "object") {
				if (t.type === "mcp-chat:ready") {
					let e = !W.current;
					W.current = !0;
					let { theme: t, user: n, context: r } = G.current;
					Y({
						type: p,
						theme: t
					}), Y({
						type: f,
						user: n
					}), Y({
						type: d,
						context: r
					}), Y({
						type: m,
						page: b()
					}), e && G.current.onReady?.();
				} else t.type === "mcp-chat:close" && !F && X(!1);
			}
		};
		return window.addEventListener("message", e), () => window.removeEventListener("message", e);
	}, [
		K,
		Y,
		X,
		F
	]), n(() => Y({
		type: d,
		context: z
	}), [Y, z]), n(() => Y({
		type: f,
		user: R
	}), [Y, R]), n(() => Y({
		type: p,
		theme: L
	}), [Y, L]), n(() => {
		V && Y({
			type: m,
			page: b()
		});
	}, [Y, V]);
	let Z = a(null), Q = a(V);
	n(() => {
		F || V === Q.current || (Q.current = V, V ? U.current?.focus() : document.activeElement === U.current && Z.current?.focus());
	}, [V, F]), r(P, () => ({
		open: () => X(!0),
		close: () => X(!1),
		toggle: () => X(!G.current.open)
	}), [X]);
	let $ = H && /* @__PURE__ */ s("iframe", {
		ref: U,
		className: "mcpcr-frame",
		src: J,
		title: l,
		allow: "clipboard-write"
	});
	return F ? /* @__PURE__ */ s("div", {
		className: T("mcpcr-inline", `mcpcr-${L}`, M),
		style: N,
		"data-mcp-chat": "",
		children: $
	}) : /* @__PURE__ */ c("div", {
		className: M,
		style: N,
		"data-mcp-chat": "",
		children: [/* @__PURE__ */ s("div", {
			className: T("mcpcr-panel", `mcpcr-${I}`, `mcpcr-${L}`, V && "mcpcr-open"),
			role: "dialog",
			"aria-label": l,
			"aria-hidden": !V,
			children: $
		}), /* @__PURE__ */ s("button", {
			type: "button",
			ref: Z,
			className: T("mcpcr-launcher", `mcpcr-${I}`),
			style: { background: ie },
			"aria-label": V ? "Close chat" : "Open chat",
			onClick: () => X(!V),
			children: s(V ? re : w, {})
		})]
	});
});
//#endregion
export { E as ChatWidget, u as MSG_CLOSE, d as MSG_CONTEXT, l as MSG_READY, p as MSG_THEME, f as MSG_USER };

//# sourceMappingURL=index.js.map