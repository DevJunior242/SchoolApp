import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://edu.intellino.tech/api",
  // Sans timeout, une requête sur une connexion coupée/instable reste en
  // attente indéfiniment au lieu d'échouer — ce qui bloque des écrans comme
  // la saisie de présences hors-ligne, qui dépendent d'un rejet rapide pour
  // basculer sur la file locale.
  timeout: 20000,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const schoolId = localStorage.getItem("current_school_id");
  if (schoolId) {
    config.headers["X-School-Id"] = schoolId;
  }

  return config;
});

// École en lecture seule (essai gratuit expiré) ou module hors palier :
// signale l'événement pour qu'un composant global (cf. DashboardLayout)
// affiche un message clair, plutôt que de laisser chaque formulaire
// retomber sur son texte d'erreur générique qui ne mentionne pas la vraie
// cause.
const BLOCKED_ACCESS_CODES = ["school_read_only", "plan_upgrade_required"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data = error.response?.data;

    // Certaines pages affichent uniquement data.errors, alors qu’une API
    // 403/422 peut renvoyer un message lisible dans data.message.
    if (data?.message && !data?.errors) {
      data.errors = { message: [data.message] };
    }

    if (BLOCKED_ACCESS_CODES.includes(data?.code)) {
      window.dispatchEvent(
        new CustomEvent("school-access-blocked", {
          detail: data.message,
        }),
      );
    }

    return Promise.reject(error);
  },
);

export default api;
