export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";
export const THEME_COLORS: Record<Theme, string> = { light: "#f9f9f6", dark: "#121412" };

const key = JSON.stringify(THEME_STORAGE_KEY);

// Exécuté dans <head> avant le premier rendu : pose data-theme sur <html> depuis le choix enregistré,
// sinon depuis le réglage de l’appareil, puis suit les changements du système et des autres onglets.
export const themeScript = `(function(){var d=document.documentElement,m=matchMedia(${JSON.stringify(DARK_QUERY)});function a(){var t=null;try{t=localStorage.getItem(${key})}catch(e){}d.dataset.theme=t==="light"||t==="dark"?t:m.matches?"dark":"light"}a();m.addEventListener("change",a);addEventListener("storage",function(e){if(e.key===${key})a()})})()`;
