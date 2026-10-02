const DEVICE_KEY = "staff_attendance_device_id";

function randomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Identifiant de ce téléphone pour le pointage : le serveur lie chaque compte
// à un seul téléphone. Vider les données du navigateur oblige à passer par la
// RH pour réinitialiser le téléphone.
export function getStaffDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function askPosition(options) {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          position: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy },
          error: null,
        }),
      (error) => resolve({ position: null, error }),
      options,
    );
  });
}

/**
 * Position de l'appareil, avec la raison en cas d'échec :
 * `denied` (autorisation refusée), `unavailable` (l'appareil ne connaît pas
 * sa position : ordinateur sans GPS, souvent branché par câble), `timeout`,
 * `unsupported` (navigateur trop ancien ou page non sécurisée).
 * Haute précision d'abord (GPS du téléphone), puis précision normale
 * (Wi-Fi / réseau) : un ordinateur échoue souvent en haute précision.
 */
export async function locateDevice() {
  if (!navigator.geolocation || !window.isSecureContext) {
    return { position: null, reason: "unsupported" };
  }

  let result = await askPosition({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  if (result.error && result.error.code !== result.error.PERMISSION_DENIED) {
    result = await askPosition({ enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
  }

  if (result.position) return { position: result.position, reason: null };
  const reasons = { 1: "denied", 2: "unavailable", 3: "timeout" };
  return { position: null, reason: reasons[result.error?.code] || "unavailable" };
}

/** Message clair selon la raison de l'échec (`locateDevice`). */
export function locationErrorMessage(reason, { place = "le bureau" } = {}) {
  switch (reason) {
    case "denied":
      return "La localisation est refusée pour ce site : cliquez sur le cadenas à gauche de l’adresse, autorisez « Position », puis réessayez.";
    case "unsupported":
      return "Ce navigateur ne peut pas donner la position (navigateur trop ancien ou page non sécurisée).";
    case "timeout":
      return `La position met trop de temps à venir. Réessayez, ou placez ${place} sur la carte (recherche d’adresse ou clic).`;
    default:
      return `Cet appareil ne connaît pas sa position (fréquent sur un ordinateur, qui n’a pas de GPS). Placez ${place} sur la carte : cherchez son adresse ou cliquez dessus.`;
  }
}

/** Position seule (pointage) : null si indisponible. */
export async function getCurrentPosition() {
  const { position } = await locateDevice();
  return position;
}
