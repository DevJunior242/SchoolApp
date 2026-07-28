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
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import QrScanner from 'qr-scanner';
import api from '../api/axios.jsx';

/**
 * Emprunt/retour de livres, onglet "Service" de la page Bibliothèque —
 * même schéma scan-caméra + recherche manuelle en secours que la cantine,
 * avec un exemplaire (pas un élève) comme cible du scan côté retour.
 */
export default function LibraryServiceTab({ schoolId }) {
  const [mode, setMode] = useState('emprunter');

  return (
    <Box sx={{ maxWidth: 480 }}>
      <ToggleButtonGroup value={mode} exclusive onChange={(_, v) => v && setMode(v)} fullWidth sx={{ mb: 3 }}>
        <ToggleButton value="emprunter">Emprunter</ToggleButton>
        <ToggleButton value="retourner">Retourner</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'emprunter' && <BorrowFlow schoolId={schoolId} />}
      {mode === 'retourner' && <ReturnFlow schoolId={schoolId} />}
    </Box>
  );
}

function BorrowFlow({ schoolId }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scanHandlerRef = useRef(() => {});
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [studentTerm, setStudentTerm] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [lookup, setLookup] = useState(null);
  const [lookupError, setLookupError] = useState(null);

  const [bookTerm, setBookTerm] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [borrowing, setBorrowing] = useState(false);
  const [borrowError, setBorrowError] = useState(null);
  const [borrowResult, setBorrowResult] = useState(null);

  async function fetchLookup(studentId) {
    setLookupError(null);
    setBorrowResult(null);
    setBorrowError(null);
    try {
      const response = await api.get(`/schools/${schoolId}/students/${studentId}/library/lookup`);
      setLookup(response.data);
    } catch (err) {
      setLookupError(err.response?.data?.message || "Impossible de trouver cet élève.");
    }
  }

  async function handleBorrow(copyId, force = false) {
    setBorrowing(true);
    setBorrowError(null);
    try {
      const response = await api.post(`/schools/${schoolId}/students/${lookup.student?.id}/library/loans`, {
        book_copy_id: copyId,
        force,
      });
      setBorrowResult(response.data);
    } catch (err) {
      if (err.response?.status === 422 && err.response?.data?.reservation) {
        setBorrowError({ ...err.response.data, copyId });
      } else {
        setBorrowError({ message: err.response?.data?.message || "Impossible d'enregistrer cet emprunt." });
      }
    } finally {
      setBorrowing(false);
    }
  }

  // Une seule caméra pour les deux étapes (badge élève, puis exemplaire) :
  // le scanner est construit une fois, mais la cible du scan (élève ou
  // exemplaire) change selon l'étape — la ref évite la fermeture figée sur
  // le premier callback (mise à jour en effet, pas pendant le rendu).
  useEffect(() => {
    scanHandlerRef.current = lookup ? handleBorrow : fetchLookup;
  });

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
          scanHandlerRef.current(result.data);
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

  async function handleStudentSearch(e) {
    e.preventDefault();
    const response = await api.get(`/schools/${schoolId}/students`, { params: { search: studentTerm, per_page: 10 } });
    setStudentResults(response.data.data);
  }

  async function handleBookSearch(e) {
    e.preventDefault();
    const response = await api.get(`/schools/${schoolId}/library/books`, { params: { search: bookTerm, per_page: 10 } });
    setBookResults(response.data.data);
  }

  function reset() {
    setLookup(null);
    setLookupError(null);
    setStudentResults([]);
    setStudentTerm('');
    setBookResults([]);
    setBookTerm('');
    setBorrowResult(null);
    setBorrowError(null);
  }

  const cameraBlock = (label) => (
    <Box>
      <video ref={videoRef} style={{ width: '100%', borderRadius: 8, display: cameraActive ? 'block' : 'none' }} />
      {!cameraActive && (
        <Button startIcon={<QrCodeScannerIcon />} variant="contained" fullWidth onClick={startCamera}>
          {label}
        </Button>
      )}
      {cameraActive && (
        <Button fullWidth sx={{ mt: 1 }} onClick={stopCamera}>
          Arrêter la caméra
        </Button>
      )}
      {cameraError && <Alert severity="warning" sx={{ mt: 1 }}>{cameraError}</Alert>}
    </Box>
  );

  if (borrowResult) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            Emprunt enregistré
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {borrowResult.student?.fullname} — {borrowResult.copy?.book?.title}
            <br />À rendre le {new Date(borrowResult.due_at).toLocaleDateString('fr-FR')}
          </Typography>
          <Button variant="contained" onClick={reset}>
            Nouvel emprunt
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!lookup) {
    return (
      <Stack spacing={3}>
        {cameraBlock('Scanner un badge élève')}
        {lookupError && <Alert severity="error">{lookupError}</Alert>}
        <Box component="form" onSubmit={handleStudentSearch}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            Ou recherche manuelle (badge oublié)
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Nom ou matricule de l'élève"
              value={studentTerm}
              onChange={(e) => setStudentTerm(e.target.value)}
            />
            <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
              Chercher
            </Button>
          </Stack>
          {studentResults.length > 0 && (
            <List sx={{ mt: 1 }}>
              {studentResults.map((s) => (
                <ListItemButton key={s.student?.id} onClick={() => fetchLookup(s.student?.id)}>
                  <ListItemText primary={s.student?.fullname} secondary={s.student?.matricule} />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>
      </Stack>
    );
  }

  return (
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
          </Box>
        </Stack>

        {lookup.active_loans?.length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {lookup.active_loans.length} emprunt(s) en cours :{' '}
            {lookup.active_loans.map((l) => l.copy?.book?.title).join(', ')}
          </Alert>
        )}
        {lookup.ready_reservations?.length > 0 && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Livre(s) réservé(s) prêt(s) à retirer : {lookup.ready_reservations.map((r) => r.book?.title).join(', ')}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Choisir un livre à emprunter
        </Typography>
        <Box component="form" onSubmit={handleBookSearch}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              placeholder="Titre, auteur ou ISBN"
              value={bookTerm}
              onChange={(e) => setBookTerm(e.target.value)}
            />
            <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
              Chercher
            </Button>
          </Stack>
        </Box>

        {bookResults.length > 0 && (
          <List sx={{ mt: 1 }}>
            {bookResults.map((book) => (
              <Box key={book.id} sx={{ mb: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {book.title} {book.author ? `— ${book.author}` : ''}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {book.available_copies_count}/{book.copies_count} exemplaire(s) disponible(s)
                </Typography>
                {book.available_copies_count === 0 && (
                  <Chip label="Aucun exemplaire disponible" size="small" sx={{ ml: 1 }} />
                )}
              </Box>
            ))}
          </List>
        )}

        {borrowError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {borrowError.message}
            {borrowError.reservation && (
              <Box sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => handleBorrow(borrowError.copyId, true)}
                  disabled={borrowing}
                >
                  Prêter quand même
                </Button>
              </Box>
            )}
          </Alert>
        )}

        <Alert severity="info" sx={{ mt: 2 }}>
          Scannez le QR de l'exemplaire choisi pour finaliser l'emprunt.
        </Alert>
        <Box sx={{ mt: 1 }}>{cameraBlock("Scanner l'exemplaire")}</Box>

        <Button fullWidth sx={{ mt: 2 }} onClick={reset}>
          Changer d'élève
        </Button>
      </CardContent>
    </Card>
  );
}

function ReturnFlow({ schoolId }) {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const [studentTerm, setStudentTerm] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [studentLoans, setStudentLoans] = useState(null);

  const [copyLookup, setCopyLookup] = useState(null);
  const [copyError, setCopyError] = useState(null);

  const [returning, setReturning] = useState(false);
  const [returnResult, setReturnResult] = useState(null);
  const [returnError, setReturnError] = useState(null);

  async function fetchCopyLookup(copyId) {
    setCopyError(null);
    setReturnResult(null);
    try {
      const response = await api.get(`/schools/${schoolId}/library/copies/${copyId}/lookup`);
      if (!response.data.loan) {
        setCopyError("Cet exemplaire n'a pas de prêt en cours.");
        return;
      }
      setCopyLookup(response.data);
    } catch {
      setCopyError('Exemplaire introuvable.');
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
          fetchCopyLookup(result.data);
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

  async function handleStudentSearch(e) {
    e.preventDefault();
    setStudentLoans(null);
    const response = await api.get(`/schools/${schoolId}/students`, { params: { search: studentTerm, per_page: 10 } });
    setStudentResults(response.data.data);
  }

  async function pickStudent(studentId) {
    const response = await api.get(`/schools/${schoolId}/students/${studentId}/library/lookup`);
    setStudentLoans(response.data);
  }

  async function handleReturn(loanId) {
    setReturning(true);
    setReturnError(null);
    try {
      const response = await api.post(`/schools/${schoolId}/library/loans/${loanId}/return`);
      setReturnResult(response.data);
    } catch (err) {
      setReturnError(err.response?.data?.message || 'Impossible de valider le retour.');
    } finally {
      setReturning(false);
    }
  }

  function reset() {
    setCopyLookup(null);
    setCopyError(null);
    setStudentLoans(null);
    setStudentResults([]);
    setStudentTerm('');
    setReturnResult(null);
    setReturnError(null);
  }

  if (returnResult) {
    return (
      <Card variant="outlined">
        <CardContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            Retour enregistré
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {returnResult.loan?.student?.fullname} — {returnResult.loan?.copy?.book?.title}
          </Typography>
          {returnResult.promoted_reservation && (
            <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
              Réservé pour {returnResult.promoted_reservation.student?.fullname} : mettez cet exemplaire de côté, ne le
              reposez pas en rayon.
            </Alert>
          )}
          <Button variant="contained" onClick={reset}>
            Nouveau retour
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (copyLookup) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {copyLookup.copy?.book?.title}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Emprunté par {copyLookup.loan?.student?.fullname} — à rendre le{' '}
            {new Date(copyLookup.loan?.due_at).toLocaleDateString('fr-FR')}
          </Typography>
          {returnError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {returnError}
            </Alert>
          )}
          <Button variant="contained" fullWidth disabled={returning} onClick={() => handleReturn(copyLookup.loan?.id)}>
            {returning ? 'Enregistrement...' : 'Confirmer le retour'}
          </Button>
          <Button fullWidth sx={{ mt: 2 }} onClick={reset}>
            Annuler
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (studentLoans) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {studentLoans.student?.fullname}
          </Typography>
          {returnError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {returnError}
            </Alert>
          )}
          {studentLoans.active_loans?.length === 0 && (
            <Typography color="text.secondary">Aucun emprunt en cours.</Typography>
          )}
          <List>
            {studentLoans.active_loans?.map((loan) => (
              <ListItemButton key={loan.id} onClick={() => handleReturn(loan.id)} disabled={returning}>
                <ListItemText
                  primary={loan.copy?.book?.title}
                  secondary={`À rendre le ${new Date(loan.due_at).toLocaleDateString('fr-FR')}`}
                />
              </ListItemButton>
            ))}
          </List>
          <Button fullWidth sx={{ mt: 2 }} onClick={reset}>
            Annuler
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={3}>
      <Box>
        <video ref={videoRef} style={{ width: '100%', borderRadius: 8, display: cameraActive ? 'block' : 'none' }} />
        {!cameraActive && (
          <Button startIcon={<QrCodeScannerIcon />} variant="contained" fullWidth onClick={startCamera}>
            Scanner l'exemplaire
          </Button>
        )}
        {cameraActive && (
          <Button fullWidth sx={{ mt: 1 }} onClick={stopCamera}>
            Arrêter la caméra
          </Button>
        )}
        {cameraError && <Alert severity="warning" sx={{ mt: 1 }}>{cameraError}</Alert>}
      </Box>
      {copyError && <Alert severity="error">{copyError}</Alert>}
      <Box component="form" onSubmit={handleStudentSearch}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
          Ou recherche par élève (exemplaire sans QR)
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            size="small"
            fullWidth
            placeholder="Nom ou matricule de l'élève"
            value={studentTerm}
            onChange={(e) => setStudentTerm(e.target.value)}
          />
          <Button type="submit" variant="outlined" startIcon={<SearchIcon />}>
            Chercher
          </Button>
        </Stack>
        {studentResults.length > 0 && (
          <List sx={{ mt: 1 }}>
            {studentResults.map((s) => (
              <ListItemButton key={s.student?.id} onClick={() => pickStudent(s.student?.id)}>
                <ListItemText primary={s.student?.fullname} secondary={s.student?.matricule} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Stack>
  );
}
