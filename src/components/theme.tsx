"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import { Toaster, type ToasterProps } from "sonner";
import { DARK_QUERY, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

const getTheme = (): Theme => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");

/** Thème affiché, ou null pendant le rendu serveur et l’hydratation. */
export function useTheme(): Theme | null {
  return useSyncExternalStore(subscribe, getTheme, () => null);
}

function setTheme(theme: Theme) {
  const system: Theme = matchMedia(DARK_QUERY).matches ? "dark" : "light";
  try {
    // Revenir au thème de l’appareil efface le choix : le site suit de nouveau le réglage système
    if (theme === system) localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
  // Coupe les transitions pendant le changement, sinon seuls certains éléments font un fondu
  const style = document.createElement("style");
  style.textContent = "*,*::before,*::after{transition:none!important}";
  document.head.appendChild(style);
  document.documentElement.dataset.theme = theme;
  document.body.getBoundingClientRect();
  requestAnimationFrame(() => style.remove());
}

export function ThemeToggle({
  className,
  iconClassName = "size-4.5",
  withLabel = false,
}: {
  className?: string;
  iconClassName?: string;
  withLabel?: boolean;
}) {
  const theme = useTheme();
  const label = theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre";
  // Icône et libellé visibles pilotés en CSS (variante dark:) : corrects dès le premier rendu
  return (
    <button
      type="button"
      onClick={() => setTheme(getTheme() === "dark" ? "light" : "dark")}
      aria-label={withLabel ? undefined : label}
      title={withLabel ? undefined : label}
      className={className}
    >
      <Moon className={`${iconClassName} dark:hidden`} aria-hidden />
      <Sun className={`${iconClassName} hidden dark:block`} aria-hidden />
      {withLabel ? (
        <>
          <span className="dark:hidden">Mode sombre</span>
          <span className="hidden dark:inline">Mode clair</span>
        </>
      ) : null}
    </button>
  );
}

export function ThemedToaster(props: Omit<ToasterProps, "theme">) {
  const theme = useTheme();
  return <Toaster {...props} theme={theme ?? "system"} />;
}

/** Aligne la couleur de la barre du navigateur (meta theme-color) sur le thème choisi. */
export function ThemeColorSync() {
  const theme = useTheme();
  useEffect(() => {
    if (!theme) return;
    // Balise dédiée en tête de <head> : le navigateur retient la première qui correspond,
    // et Next ne la réécrit pas lors des navigations (contrairement à celles de viewport)
    let meta = document.head.querySelector<HTMLMetaElement>("meta[data-theme-color]");
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.dataset.themeColor = "";
      document.head.prepend(meta);
    }
    meta.content = THEME_COLORS[theme];
  }, [theme]);
  return null;
}
