import { useEffect, useState } from "react";

const QUERY = "(prefers-color-scheme: dark)";

// theme: "light" | "dark" | "auto" (follows the OS setting, live).
export function useDarkMode(theme) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const onChange = (e) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return theme === "dark" || (theme !== "light" && systemDark);
}
