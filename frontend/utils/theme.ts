export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "color-scheme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const val = window.localStorage.getItem(STORAGE_KEY);
    if (val === "light" || val === "dark") return val;
  } catch {
    // Ignore storage access errors
  }
  return "system";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getResolvedTheme(): ResolvedTheme {
  const stored = getStoredTheme();
  return stored === "system" ? getSystemTheme() : stored;
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const meta = document.querySelector('meta[name="color-scheme"]');
  const contentValue = mode === "system" ? "light dark" : mode;
  if (meta) {
    meta.setAttribute("content", contentValue);
  }
  try {
    if (mode === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, mode);
    }
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(new Event("gasline-theme-change"));
}

/**
 * Two-state toggle per modern color-scheme guidance:
 * Computes the opposite of the currently rendered theme, storing a literal override
 * only when it diverges from the current OS preference.
 */
export function toggleThemeTwoState(): ResolvedTheme {
  const currentRendered = getResolvedTheme();
  const target: ResolvedTheme = currentRendered === "dark" ? "light" : "dark";
  const systemPref = getSystemTheme();

  if (target === systemPref) {
    applyTheme("system");
  } else {
    applyTheme(target);
  }
  return getResolvedTheme();
}

export function subscribeThemeChanges(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      const stored = getStoredTheme();
      const meta = document.querySelector('meta[name="color-scheme"]');
      if (meta) {
        meta.setAttribute("content", stored === "system" ? "light dark" : stored);
      }
      callback();
    }
  };

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMedia = () => callback();
  const handleCustom = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener("gasline-theme-change", handleCustom);
  mediaQuery.addEventListener("change", handleMedia);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("gasline-theme-change", handleCustom);
    mediaQuery.removeEventListener("change", handleMedia);
  };
}
