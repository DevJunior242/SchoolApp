import { useEffect, useState } from 'react';
import api from '../api/axios.jsx';

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
        setData(response.data.data);
        setLastPage(response.data.last_page);
        setTotal(response.data.total);
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
