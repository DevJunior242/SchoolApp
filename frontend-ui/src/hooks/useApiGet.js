import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios.jsx';

const DEFAULT_ERROR = 'Impossible de charger les données. Vérifiez votre connexion et réessayez.';

/**
 * GET avec gestion uniforme du chargement + des erreurs réseau/serveur
 * (jusqu'ici silencieusement ignorées un peu partout : la page restait
 * vide sans indication en cas d'échec). `enabled: false` permet d'attendre
 * une dépendance (ex: schoolId) avant de lancer la requête.
 */
export function useApiGet(url, { params, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const paramsKey = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!enabled || !url) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(url, { params });
      setData(response.data);
    } catch (err) {
      setError(err.response?.data?.message || DEFAULT_ERROR);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, enabled, paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
