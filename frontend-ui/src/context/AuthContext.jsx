import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/axios.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get('/me')
      .then((response) => setUser(response.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  // Garde le header X-School-Id (envoyé automatiquement par axios) en phase
  // avec l'école active, pour que le middleware backend puisse s'y fier sans
  // que chaque page n'ait à le gérer elle-même.
  useEffect(() => {
    if (user?.current_school_id) {
      localStorage.setItem('current_school_id', user.current_school_id);
    } else {
      localStorage.removeItem('current_school_id');
    }
  }, [user]);

  async function login(email, password) {
    const response = await api.post('/login', { email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function register(data) {
    const response = await api.post('/register', data);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function logout() {
    await api.post('/logout').catch(() => {});
    localStorage.removeItem('token');
    setUser(null);
  }

  async function refreshUser() {
    const response = await api.get('/me');
    setUser(response.data);
    return response.data;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
