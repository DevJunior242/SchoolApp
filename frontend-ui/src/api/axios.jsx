import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
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

export default api;
