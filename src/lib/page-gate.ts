// « Porte » de la page publique : tant que l’écran de préchargement (premier passage de la
// session) ou le rideau d’une transition de page la recouvre, les animations d’apparition
// attendent, pour se jouer sous les yeux du visiteur plutôt que derrière le rideau.
//
// - introScript, exécuté dans <head> avant le premier rendu, pose data-intro sur <html>
//   quand le préchargement doit être joué : le CSS l’affiche alors sans clignotement.
// - <Preloader /> attend que la scène 3D soit prête (waitForStage), puis libère la page (finishIntro).
// - <PageTransition /> retient la page (holdPage) le temps de son rideau.
// - Les animations d’entrée attendent whenPageVisible.

export const INTRO_STORAGE_KEY = "intro-seen";

export const introScript = `(function(){try{var d=document.documentElement;if(sessionStorage.getItem(${JSON.stringify(INTRO_STORAGE_KEY)}))return;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;if(/^\\/(admin|d)(\\/|$)/.test(location.pathname))return;d.dataset.intro="1"}catch(e){}})()`;

type Callback = () => void;

let introFinished = false;
let holds = 0;
const visibleListeners = new Set<Callback>();

export function isIntroPending() {
  return !introFinished && typeof document !== "undefined" && document.documentElement.dataset.intro === "1";
}

export function isPageHidden() {
  return holds > 0 || isIntroPending();
}

function flush() {
  if (isPageHidden()) return;
  const callbacks = [...visibleListeners];
  visibleListeners.clear();
  for (const callback of callbacks) callback();
}

/** Appelle `callback` dès que la page est visible (tout de suite si rien ne la couvre). Renvoie de quoi annuler. */
export function whenPageVisible(callback: Callback) {
  if (!isPageHidden()) {
    callback();
    return () => {};
  }
  visibleListeners.add(callback);
  return () => visibleListeners.delete(callback);
}

/** Retient la page (rideau de transition). Renvoie la fonction qui la libère, utilisable une seule fois. */
export function holdPage() {
  holds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holds = Math.max(0, holds - 1);
    flush();
  };
}

export function finishIntro() {
  if (introFinished) return;
  introFinished = true;
  try {
    sessionStorage.setItem(INTRO_STORAGE_KEY, "1");
  } catch {}
  delete document.documentElement.dataset.intro;
  flush();
}

// Scène 3D de l’accueil : le préchargement attend qu’elle soit prête avant de s’effacer,
// pour dévoiler directement le téléphone plutôt qu’un écran vide.
let stageIsReady = false;
const stageListeners = new Set<Callback>();

export function markStageReady() {
  stageIsReady = true;
  const callbacks = [...stageListeners];
  stageListeners.clear();
  for (const callback of callbacks) callback();
}

export function resetStageReady() {
  stageIsReady = false;
}

/** Résout quand la scène est prête, ou après `timeout` ms (la page s’affiche quoi qu’il arrive). */
export function waitForStage(timeout: number) {
  return new Promise<void>((resolve) => {
    if (stageIsReady) return resolve();
    const timer = window.setTimeout(done, timeout);
    function done() {
      window.clearTimeout(timer);
      stageListeners.delete(done);
      resolve();
    }
    stageListeners.add(done);
  });
}
