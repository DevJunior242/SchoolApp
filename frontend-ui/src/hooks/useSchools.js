import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function useSchools() {
  const { refreshUser } = useAuth();
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await api.get('/my-schools');
    setSchoolUsers(response.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createSchool(data) {
    await api.post('/schools', data);
    await Promise.all([load(), refreshUser()]);
  }

  async function switchSchool(schoolId) {
    await api.post(`/schools/${schoolId}/switch`);
    await Promise.all([load(), refreshUser()]);
  }

  return { schoolUsers, loading, createSchool, switchSchool, reload: load };
}
