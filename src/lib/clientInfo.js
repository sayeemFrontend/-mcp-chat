// What the browser tells about itself without asking: sent as `client` with a session's first message and stored
// by the LLM server with the session (and, the device part, with the visitor). Plain browser APIs only: nothing
// that needs a permission (location, notifications) and no fingerprinting (canvas, fonts, audio, hardware).
// Every field is optional; one that throws is left out.

const attempt = (read) => {
  try {
    const value = read();
    return value === "" || value === null || Number.isNaN(value) ? undefined : value;
  } catch {
    return undefined;
  }
};
const cut = (value, max) => (typeof value === "string" && value ? value.slice(0, max) : undefined);

// navigator.userAgentData (Chromium): real brands only, without the "Not A Brand" placeholder.
function brandFromHints(uaData) {
  const known = ["Microsoft Edge", "Opera", "Google Chrome", "Chromium", "Brave"];
  const brands = (uaData?.brands || []).filter((b) => !/not.?a.?brand/i.test(b.brand));
  const brand = known.map((name) => brands.find((b) => b.brand === name)).find(Boolean) || brands[0];
  return brand && { name: brand.brand.replace(/^Google /, "").replace(/^Microsoft /, ""), version: brand.version };
}

// Everything else: a simple user-agent match (order matters: Edge and Opera also say Chrome, Chrome says Safari).
function browserFromAgent(ua) {
  const rules = [
    ["Edge", /Edg(?:e|A|iOS)?\/(\d+)/],
    ["Opera", /(?:OPR|Opera)\/(\d+)/],
    ["Samsung Internet", /SamsungBrowser\/(\d+)/],
    ["Firefox", /(?:Firefox|FxiOS)\/(\d+)/],
    ["Chrome", /(?:Chrome|CriOS)\/(\d+)/],
    ["Safari", /Version\/(\d+).*Safari/],
  ];
  for (const [name, re] of rules) {
    const m = ua.match(re);
    if (m) return { name, version: m[1] };
  }
  return null;
}

function osFromAgent(ua) {
  if (/Windows/.test(ua)) return "Windows";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/CrOS/.test(ua)) return "ChromeOS";
  if (/Mac OS X|Macintosh/.test(ua)) return "macOS";
  if (/Linux/.test(ua)) return "Linux";
  return undefined;
}

function deviceType(ua, uaData, touch) {
  // iPadOS reports itself as a Mac; a touch screen gives it away.
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) || (/Macintosh/.test(ua) && touch)) {
    return "tablet";
  }
  if (uaData?.mobile || /Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  if (touch && Math.min(window.screen.width, window.screen.height) < 600) return "mobile";
  return "desktop";
}

// `page`: the host page ({ url, title, referrer, viewport }, see lib/protocol.js), when known. Inside the iframe
// embeds the viewport is the host page's (from `page`), not the chat panel's.
export function clientInfo(page) {
  const nav = window.navigator;
  const framed = attempt(() => window.self !== window.top) ?? true;
  const ua = attempt(() => nav.userAgent) || "";
  const uaData = attempt(() => nav.userAgentData);
  const touch = attempt(() => nav.maxTouchPoints > 0);
  const browser = attempt(() => brandFromHints(uaData)) || attempt(() => browserFromAgent(ua));
  const info = {
    language: cut(attempt(() => nav.language), 35),
    languages: attempt(() => [...nav.languages].slice(0, 10).map((l) => String(l).slice(0, 35))),
    timezone: cut(attempt(() => Intl.DateTimeFormat().resolvedOptions().timeZone), 64),
    screen: attempt(() => ({
      width: window.screen.width,
      height: window.screen.height,
      pixel_ratio: Math.round(window.devicePixelRatio * 100) / 100,
    })),
    viewport: page?.viewport || (framed ? undefined : attempt(() => ({ width: window.innerWidth, height: window.innerHeight }))),
    device_type: attempt(() => deviceType(ua, uaData, touch)),
    os: cut(attempt(() => uaData?.platform) || attempt(() => osFromAgent(ua)), 40),
    browser: cut(browser?.name, 40),
    browser_version: cut(browser?.version, 20),
    touch,
    page_url: page?.url,
    page_title: page?.title,
    referrer: page?.referrer,
  };
  return Object.fromEntries(Object.entries(info).filter(([, v]) => v !== undefined));
}
