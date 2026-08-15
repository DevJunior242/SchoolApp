import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import QrScanner from 'qr-scanner';
import api from '../api/axios.jsx';
import { db } from '../offline/db.js';

function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Scan QR (ou recherche manuelle en secours) → fiche élève → servir.
 * Onglet "Service" de la page Cantine (staff), pas une page à part : évite
 * une entrée de menu séparée pour un sous-workflow du même sujet.
 *
 * "Servir" débite le portefeuille de l'élève en direct côté serveur (et
 * vérifie "déjà servi aujourd'hui") : contrairement aux présences/notes, on
 * ne met JAMAIS cette action en file d'attente hors-ligne — ça pourrait
 * faire servir deux fois le même repas ou débiter un solde périmé avant
 * qu'on s'en rende compte. Le cache Dexie ici ne sert qu'à garder une
 * référence visuelle (menu du jour, nom/matricule déjà recherchés) ; "Servir"
 * reste bloqué sans connexion.
 */
export default function CafeteriaServiceTab({ schoolId }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [online, setOnline] = useState(navigator.onLine);
  const [todayMenu, setTodayMenu] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [lookup, setLookup] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [serving, setServing] = useState(false);
  const [serveError, setServeError] = useState(null);
  const [serveResult, setServeResult] = useState(null);

  useEffect(() => {
    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Menu du jour affiché en permanence (avant même de scanner un élève) :
  // en ligne on le récupère et on le met en cache, hors-ligne on retombe sur
  // la dernière version connue.
  useEffect(() => {
    if (!schoolId) return;

    async function loadMenu() {
      const date = today();
      const cacheId = `${schoolId}_${date}`;

      if (navigator.onLine) {
        try {
          const response = await api.get(`/schools/${schoolId}/cafeteria/menu`, { params: { date } });
          if (response.data) {
            await db.cafeteriaMenus.put({ id: cacheId, school_id: schoolId, date, ...response.data });
          }
          setTodayMenu(response.data);
          return;
        } catch {
          // pas de réponse serveur : on retombe sur le cache ci-dessous
        }
      }

      const cached = await db.cafeteriaMenus.get(cacheId);
      setTodayMenu(cached ?? null);
    }

    loadMenu();
  }, [schoolId]);

  async function fetchLookup(studentId) {
    setLookupError(null);
    setServeResult(null);
    setServeError(null);
    setSelectedItemId('');

    if (!navigator.onLine) {
      // Le solde et le statut "déjà servi" changent à chaque repas : pas de
      // valeur fiable à afficher depuis un cache pour cette étape.
      setLookupError(
        'Connexion perdue : le solde et le statut "déjà servi" ne peuvent pas être vérifiés hors-ligne.',
      );
      return;
    }

    try {
      const response = await api.get(`/schools/${schoolId}/students/${studentId}/cafeteria/lookup`);
      setLookup(response.data);
      setSelectedStudentId(studentId);
    } catch (err) {
      setLookupError(
        !err.response
          ? 'Connexion perdue : impossible de charger les informations de cet élève.'
          : err.response?.data?.message || 'Impossible de trouver cet élève.',
      );
    }
  }

  function stopCamera() {
    scannerRef.current?.stop();
    setCameraActive(false);
  }

  async function startCamera() {
    setCameraError(null);
    if (!scannerRef.current && videoRef.current) {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          stopCamera();
          fetchLookup(result.data);
        },
        { highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true }
      );
    }
    try {
      await scannerRef.current.start();
      setCameraActive(true);
    } catch {
      setCameraError("Impossible d'accéder à la caméra. Utilisez la recherche manuelle ci-dessous.");
    }
  }

  useEffect(() => {
    return () => scannerRef.current?.destroy();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    setSearching(true);
    try {
      if (navigator.onLine) {
        const response = await api.get(`/schools/${schoolId}/students`, { params: { search: searchTerm, per_page: 10 } });
        const results = response.data.data;
        setSearchResults(results);

        // Alimente le cache local (nom/matricule seulement) pour pouvoir
        // retrouver ces élèves hors-ligne plus tard — jamais leur solde.
        await db.cafeteriaStudents.bulkPut(
          results
            .filter((r) => r.student?.id)
            .map((r) => ({
              id: r.student.id,
              school_id: schoolId,
              fullname: r.student.fullname,
              matricule: r.student.matricule,
            })),
        );
      } else {
        const term = searchTerm.trim().toLowerCase();
        const cached = await db.cafeteriaStudents.where('school_id').equals(schoolId).toArray();
        const filtered = term
          ? cached.filter(
              (s) =>
                s.fullname?.toLowerCase().includes(term) ||
                s.matricule?.toLowerCase().includes(term),
            )
          : cached;

        setSearchResults(filtered.map((s) => ({ student: s })));
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleServe(force = false) {
    if (!navigator.onLine) {
      setServeError({
        message: 'Connexion perdue : impossible de servir sans connexion (le solde ne peut pas être vérifié en toute sécurité).',
      });
      return;
    }

    setServing(true);
    setServeError(null);
    try {
      const response = await api.post(`/schools/${schoolId}/students/${selectedStudentId}/cafeteria/serve`, {
        cafeteria_menu_item_id: selectedItemId,
        force,
      });
      setServeResult(response.data);
    } catch (err) {
      if (!err.response) {
        setServeError({
          message: "Connexion perdue pendant l'envoi : vérifiez si le repas a bien été enregistré avant de réessayer.",
        });
      } else if (err.response?.status === 422 && err.response?.data?.price !== undefined) {
        setServeError(err.response.data);
      } else {
        setServeError({ message: err.response?.data?.message || 'Impossible de servir ce repas.' });
      }
    } finally {
      setServing(false);
    }
  }

  function reset() {
    setSelectedStudentId(null);
    setLookup(null);
    setServeResult(null);
    setServeError(null);
    setSearchResults([]);
    setSearchTerm('');
  }

  return (
    <Box sx={{ maxWidth: 480 }}>
      {!online && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Hors connexion : recherche disponible depuis le cache local, mais
          impossible de servir un repas (débit du solde) sans connexion.
        </Alert>
      )}

      {todayMenu && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Menu du jour{!online && ' (dernière version connue)'}
            </Typography>
            <Stack spacing={0.5}>
              {todayMenu.items?.map((item) => (
                <Typography key={item.id ?? item.label} variant="body2" color="text.secondary">
                  {item.label} — {Number(item.price).toLocaleString()} FCFA
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {!lookup && (
        <Stack spacing={3}>
          <Box>
            <video ref={videoRef} style={{ width: '100%', borderRadius: 8, display: cameraActive ? 'block' : 'none' }} />
            {!cameraActive && (
              <Button startIcon={<QrCodeScannerIcon />} variant="contained" fullWidth onClick={startCamera}>
                Scanner un badge
              </Button>
            )}
            {cameraActive && (
              <Button fullWidth sx={{ mt: 1 }} onClick={stopCamera}>
                Arrêter la caméra
              </Button>
            )}
            {cameraError && <Alert severity="warning" sx={{ mt: 1 }}>{cameraError}</Alert>}
          </Box>

          {lookupError && <Alert severity="error">{lookupError}</Alert>}

          <Box component="form" onSubmit={handleSearch}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Ou recherche manuelle (badge oublié)
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="Nom ou matricule de l'élève"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button type="submit" variant="outlined" startIcon={<SearchIcon />} disabled={searching}>
                Chercher
              </Button>
            </Stack>
            {searchResults.length > 0 && (
              <List sx={{ mt: 1 }}>
                {searchResults.map((s) => (
                  <ListItemButton key={s.student?.id} onClick={() => fetchLookup(s.student?.id)}>
                    {/* Le matricule est affiché pour distinguer des élèves aux
                        noms proches avant de servir/débiter le bon élève. */}
                    <ListItemText primary={s.student?.fullname} secondary={s.student?.matricule} />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Box>
        </Stack>
      )}

      {lookup && !serveResult && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                {lookup.student?.fullname?.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6">{lookup.student?.fullname}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {lookup.student?.matricule}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Solde : {Number(lookup.wallet_balance).toLocaleString()} FCFA
                  {lookup.has_active_subscription && (
                    <Chip label="Abonnement actif" size="small" color="success" sx={{ ml: 1 }} />
                  )}
                </Typography>
              </Box>
            </Stack>

            {lookup.already_served && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Cet élève a déjà été servi aujourd'hui.
              </Alert>
            )}

            {!lookup.menu && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Aucun menu défini pour aujourd'hui.
              </Alert>
            )}

            {lookup.menu && !lookup.already_served && (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Menu du jour
                </Typography>
                <RadioGroup value={selectedItemId} onChange={(e) => setSelectedItemId(e.target.value)}>
                  {lookup.menu.items.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      value={item.id}
                      control={<Radio />}
                      label={`${item.label} — ${Number(item.price).toLocaleString()} FCFA`}
                    />
                  ))}
                </RadioGroup>

                {serveError && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {serveError.message}
                    {serveError.price !== undefined && (
                      <Box sx={{ mt: 1 }}>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleServe(true)} disabled={serving || !online}>
                          Servir quand même
                        </Button>
                      </Box>
                    )}
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  sx={{ mt: 2 }}
                  disabled={!selectedItemId || serving || !online}
                  onClick={() => handleServe(false)}
                >
                  {serving ? 'Enregistrement...' : online ? 'Servir' : 'Servir (connexion requise)'}
                </Button>
              </>
            )}

            <Button fullWidth sx={{ mt: 2 }} onClick={reset}>
              Scanner un autre élève
            </Button>
          </CardContent>
        </Card>
      )}

      {serveResult && (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="success.main" gutterBottom>
              Repas servi
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {serveResult.student?.fullname} — {serveResult.menu_item?.label}
            </Typography>
            <Button variant="contained" onClick={reset}>
              Scanner un autre élève
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
