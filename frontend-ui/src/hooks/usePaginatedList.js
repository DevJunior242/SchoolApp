import { useEffect, useState } from 'react';
import api from '../api/axios.jsx';
import { asArray } from '../utils/apiData.js';

const DEFAULT_ERROR = 'Impossible de charger la liste. Vérifiez votre connexion et réessayez.';

/**
 * Liste paginée + recherche côté serveur, réutilisée par les pages
 * Membres/Professeurs/Classes/Élèves (mêmes filtres, même pagination MUI).
 */
export function usePaginatedList(url, extraParams = {}) {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const extraParamsKey = JSON.stringify(extraParams);

  useEffect(() => {
    setPage(1);
  }, [search, extraParamsKey]);

  useEffect(() => {
    if (!url) return;
    setLoading(true);
    setError(null);
    api
      .get(url, { params: { page, search: search || undefined, ...extraParams } })
      .then((response) => {
        const payload = response?.data;
        const metadata = payload?.data && !Array.isArray(payload.data)
          ? payload.data
          : payload;
        setData(asArray(payload));
        setLastPage(metadata?.last_page ?? 1);
        setTotal(metadata?.total ?? asArray(payload).length);
      })
      .catch((err) => setError(err.response?.data?.message || DEFAULT_ERROR))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, page, search, extraParamsKey, reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  return { data, page, setPage, lastPage, total, search, setSearch, loading, error, reload };
}
