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
