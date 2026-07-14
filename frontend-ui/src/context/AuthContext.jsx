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
