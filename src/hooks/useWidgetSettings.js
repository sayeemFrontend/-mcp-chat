import { useEffect, useState } from "react";

// The widget settings the tenant chose in the admin console (title, greeting, accent_color, position), plus the
// tenant and audience the key resolves to. Fetched once per services object; null until loaded or on error
// (the chat then shows the error when a message is sent).
const cache = new WeakMap();

export function useWidgetSettings(services) {
  const [settings, setSettings] = useState(null);
  useEffect(() => {
    if (!services?.widgetApi) return;
    if (!cache.has(services)) cache.set(services, services.widgetApi.get().catch(() => null));
    let live = true;
    cache.get(services).then((s) => live && setSettings(s));
    return () => {
      live = false;
    };
  }, [services]);
  return settings;
}
