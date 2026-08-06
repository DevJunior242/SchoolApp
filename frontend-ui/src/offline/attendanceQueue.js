import api from '../api/axios.jsx';

const QUEUE_KEY = 'offline_attendance_queue';
const rosterKey = (assignmentId) => `offline_roster_${assignmentId}`;

/**
 * File d'attente des présences saisies hors-ligne, en attente d'envoi.
 * Stockage localStorage (pas IndexedDB) : le volume est minuscule — une
 * poignée de soumissions au plus, une par classe par jour — donc pas besoin
 * d'un moteur de requêtes, juste un tableau JSON qu'on relit entièrement.
 */
function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function queueAttendance({ assignmentId, date, records }) {
  const queue = readQueue();
  queue.push({
    id: `${assignmentId}-${date}-${Date.now()}`,
    assignmentId,
    date,
    records,
    queuedAt: new Date().toISOString(),
  });
  writeQueue(queue);
}

export function getQueuedCount() {
  return readQueue().length;
}

/**
 * Dernière liste d'élèves connue pour cette classe, pour pouvoir afficher
 * l'écran de saisie même sans réseau. Rafraîchie à chaque chargement réussi.
 */
export function cacheRoster(assignmentId, students) {
  try {
    localStorage.setItem(rosterKey(assignmentId), JSON.stringify(students));
  } catch {
    // Quota localStorage dépassé : tant pis, pas de cache cette fois.
  }
}

export function getCachedRoster(assignmentId) {
  try {
    return JSON.parse(localStorage.getItem(rosterKey(assignmentId)) || 'null');
  } catch {
    return null;
  }
}

/**
 * Renvoie chaque présence en attente. Une entrée qui échoue à nouveau
 * (réseau toujours indisponible, ou erreur serveur) reste dans la file ;
 * une entrée acceptée par le serveur en est retirée. Ne bloque jamais sur
 * une entrée en erreur — les suivantes sont quand même tentées.
 */
export async function flushAttendanceQueue() {
  const queue = readQueue();
  if (queue.length === 0) return { sent: 0, remaining: 0 };

  const stillPending = [];
  let sent = 0;

  for (const entry of queue) {
    try {
      await api.post(`/assignments/${entry.assignmentId}/attendances`, {
        date: entry.date,
        records: entry.records,
      });
      sent += 1;
    } catch {
      stillPending.push(entry);
    }
  }

  writeQueue(stillPending);
  return { sent, remaining: stillPending.length };
}
