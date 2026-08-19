import { useEffect, useRef } from "react";

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// N'affiche rien si VITE_TURNSTILE_SITE_KEY n'est pas configurée (miroir du
// fail-open côté backend quand TURNSTILE_SECRET_KEY est vide).
export default function TurnstileWidget({ onVerify }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    if (!SITE_KEY) return undefined;
    let cancelled = false;

    loadTurnstileScript().then((turnstile) => {
      if (cancelled || !containerRef.current || !turnstile) return;
      widgetIdRef.current = turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onVerify(token),
        "expired-callback": () => onVerify(""),
        "error-callback": () => onVerify(""),
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!SITE_KEY) return null;

  return <div ref={containerRef} />;
}
