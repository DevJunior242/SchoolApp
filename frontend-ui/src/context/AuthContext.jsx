import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios.jsx";
import {
  claimOfflineData,
  countPending,
  flushQueue,
  releaseOfflineData,
} from "../offline/sync.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/me")
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem("token"))
      .finally(() => setLoading(false));
  }, []);

  // Garde le header X-School-Id (envoyé automatiquement par axios) en phase
  // avec l'école active, pour que le middleware backend puisse s'y fier sans
  // que chaque page n'ait à le gérer elle-même.
  useEffect(() => {
    if (user?.current_school_id) {
      localStorage.setItem("current_school_id", user.current_school_id);
    } else {
      localStorage.removeItem("current_school_id");
    }
  }, [user]);

  // Rattache les données hors-ligne du téléphone au compte connecté (et
  // efface celles d'un autre compte).
  useEffect(() => {
    if (user?.id) claimOfflineData(user.id).catch(() => {});
  }, [user?.id]);

  async function login(email, password) {
    const response = await api.post("/login", { email, password });

    if (response.data.two_factor) {
      // Pas de compte connecté pour l'instant : juste le jeton temporaire
      // que verifyTwoFactor() devra échanger contre le vrai token.
      return { twoFactor: true, challengeToken: response.data.token };
    }

    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
    return { twoFactor: false, user: response.data.user };
  }

  async function verifyTwoFactor(challengeToken, credentials) {
    const response = await api.post("/2fa/challenge", {
      token: challengeToken,
      ...credentials,
    });
    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function register(data) {
    const response = await api.post("/register", data);
    localStorage.setItem("token", response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  // Renvoie false si l'utilisateur annule (saisies hors-ligne non envoyées).
  async function logout() {
    if (user?.id) {
      await flushQueue(user.id).catch(() => {});
      const remaining = await countPending(user.id).catch(() => 0);
      if (
        remaining > 0 &&
        !window.confirm(
          `${remaining} saisie(s) faite(s) hors connexion n’ont pas encore été envoyées. ` +
            "Elles seront envoyées à votre prochaine connexion sur ce téléphone, jamais avec un autre compte. " +
            "Se déconnecter quand même ?",
        )
      ) {
        return false;
      }
    }

    await api.post("/logout").catch(() => {});
    localStorage.removeItem("token");
    await releaseOfflineData().catch(() => {});
    setUser(null);
    return true;
  }

  async function refreshUser() {
    const response = await api.get("/me");
    setUser(response.data);
    return response.data;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyTwoFactor,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
