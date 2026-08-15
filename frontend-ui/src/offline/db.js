import Dexie from "dexie";

export const db = new Dexie("SchoolApp");

db.version(1).stores({
  rosters: "id, assignmentId",
  attendances: "id, assignmentId, date, student_id, status",
  syncQueue: "id, type, status, createdAt",
});

// v2 : ajoute un index composé [type+status] sur syncQueue. On filtre
// toujours cette table par les deux champs à la fois (voir
// refreshQueuedCount/flushAttendanceQueue dans AttendanceEntryPage.jsx) ;
// sans index dédié, Dexie doit scanner un des deux index puis filtrer le
// reste en mémoire — un index composé lui permet de trouver directement
// les bonnes lignes. Une nouvelle version() est nécessaire même pour un
// simple ajout d'index : Dexie ne réécrit pas le schéma d'une base déjà
// créée dans le navigateur sans qu'on lui dise explicitement "voici la
// version suivante".
db.version(2).stores({
  syncQueue: "id, type, status, createdAt, [type+status]",
});

// v3 : deux tables pour la saisie des notes hors-ligne (GradeEntryPage) :
// - seasons : cache des trimestres/semestres d'une école, nécessaires pour le
//   formulaire même hors-ligne (indexée par school_id pour les retrouver par
//   école).
// - grades : cache des notes d'un cours. Le champ `pending` distingue une
//   note déjà connue du serveur (false, remplacée à chaque rechargement)
//   d'une note saisie hors-ligne pas encore synchronisée (true, encore dans
//   syncQueue) — sans ça un rechargement depuis le serveur effacerait une
//   note en attente d'envoi avant même qu'elle ait pu partir.
// rosters, attendances et syncQueue ne changent pas : inutile de les
// redéclarer, Dexie garde le schéma des tables non listées dans une nouvelle
// version.
db.version(3).stores({
  seasons: "id, school_id",
  grades: "id, assignmentId, student_id, pending",
});
