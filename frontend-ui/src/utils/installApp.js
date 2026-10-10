/*
 * Installation de l'application sur l'écran d'accueil (tablette, téléphone, PC).
 * Chrome/Edge (Android, Windows) envoient « beforeinstallprompt » très tôt,
 * parfois avant l'affichage de React : on le garde ici dès le chargement.
 * Sur iPad/iPhone (Safari), pas d'événement : on explique le geste à faire.
 * Repris d'Intellino shop. Le service worker est enregistré par
 * vite-plugin-pwa (registerSW.js), pas ici.
 */
let deferredPrompt = null;
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

export function subscribeInstall(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall() {
  return deferredPrompt !== null;
}

/** Déjà ouverte comme application (icône de l'écran d'accueil) ? */
export function isInstalled() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

/** iPad / iPhone : l'installation se fait à la main depuis Safari. */
export function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  // Les iPad récents se présentent comme un Mac : on les reconnaît à l'écran tactile.
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notify();
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice?.outcome === "accepted";
}

/** Firefox sur ordinateur ne sait pas installer une application web. */
export function isFirefox() {
  if (typeof navigator === "undefined") return false;
  return /Firefox\//.test(navigator.userAgent);
}

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isEdge() {
  if (typeof navigator === "undefined") return false;
  return /Edg\//.test(navigator.userAgent);
}
