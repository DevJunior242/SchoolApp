import api from "../api/axios.jsx";
import { db } from "./db.js";

// File d'envoi hors-ligne commune à toute l'application.
//
// Chaque entrée de syncQueue porte l'id de son auteur (userId) et n'est
// envoyée qu'avec SA session : sur un téléphone partagé, les présences
// saisies hors-ligne par un professeur ne doivent jamais partir avec le
// compte du suivant (elles seraient enregistrées à son nom, ou refusées et
// perdues).

export const QUEUE_CHANGED_EVENT = "offline-queue-changed";

const OWNER_KEY = "offline_owner_id";

// Tables de cache (lecture) : effacées quand un autre compte se connecte
// sur ce téléphone, pour qu'il ne voie pas les élèves/notes du précédent.
const CACHE_TABLES = [
  "rosters",
  "attendances",
  "grades",
  "seasons",
  "cafeteriaMenus",
  "cafeteriaStudents",
];

const SENDERS = {
  attendance: (payload) =>
    api.post(`/assignments/${payload.assignmentId}/attendances`, {
      date: payload.date,
      records: payload.records,
    }),
  grade: (payload) =>
    api.post(`/assignments/${payload.assignmentId}/grades`, payload.form),
};

function notify(detail) {
  window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT, { detail }));
}

function readOwner() {
  try {
    return localStorage.getItem(OWNER_KEY);
  } catch {
    return null;
  }
}

function writeOwner(userId) {
  try {
    if (userId) localStorage.setItem(OWNER_KEY, userId);
    else localStorage.removeItem(OWNER_KEY);
  } catch {
    // Stockage indisponible : le nettoyage à la déconnexion reste actif.
  }
}

export async function clearOfflineCache() {
  await Promise.all(CACHE_TABLES.map((table) => db.table(table).clear()));
}

// À appeler dès qu'un compte est connecté. Si le téléphone était utilisé par
// un autre compte, on efface son cache. Les entrées d'avant cette version
// (sans userId) sont attribuées au propriétaire précédent s'il est connu,
// sinon au compte connecté (resté connecté depuis la saisie).
export async function claimOfflineData(userId) {
  const previousOwner = readOwner();

  await db.syncQueue
    .filter((item) => !item.userId)
    .modify({ userId: previousOwner || userId });

  if (previousOwner && previousOwner !== userId) {
    await clearOfflineCache();
  }

  writeOwner(userId);
  notify({ synced: 0 });
}

export async function releaseOfflineData() {
  await clearOfflineCache();
  writeOwner(null);
}

export async function enqueue(type, payload, userId, id = crypto.randomUUID()) {
  await db.syncQueue.add({
    id,
    type,
    status: "pending",
    createdAt: Date.now(),
    userId,
    payload,
  });
  notify({ synced: 0 });
  return id;
}

export function countPending(userId, type) {
  return db.syncQueue
    .filter(
      (item) =>
        item.status === "pending" &&
        item.userId === userId &&
        (!type || item.type === type),
    )
    .count();
}

let inFlight = null;

// Envoie les entrées en attente de ce compte. Un seul envoi à la fois pour
// toute l'application : sinon la page de notes et l'envoi global pourraient
// poster la même note deux fois au retour du réseau.
export function flushQueue(userId) {
  if (!userId) return Promise.resolve({ synced: [] });
  if (!inFlight) {
    inFlight = runFlush(userId).finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runFlush(userId) {
  const pending = await db.syncQueue
    .filter((item) => item.status === "pending" && item.userId === userId)
    .sortBy("createdAt");
  const synced = [];

  for (const item of pending) {
    const send = SENDERS[item.type];
    if (!send) continue;

    try {
      await send(item.payload);
      await db.syncQueue.delete(item.id);
      // Même id que la note mise en cache lors de la saisie hors-ligne : le
      // prochain chargement ira chercher la vraie version côté serveur.
      if (item.type === "grade") await db.grades.delete(item.id);
      synced.push(item);
    } catch (error) {
      // Toujours hors ligne, ou session expirée : les suivantes échoueront
      // pareil, on les garde pour la prochaine fois.
      if (!error.response || error.response.status === 401) break;
      // Erreur serveur (validation, droits) : ne se résoudra pas toute
      // seule, on arrête de la retenter à chaque retour de connexion.
      await db.syncQueue.update(item.id, { status: "failed" });
    }
  }

  notify({ synced });
  return { synced };
}
