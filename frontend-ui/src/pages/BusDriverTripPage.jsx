import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Paper,
} from "@mui/material";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RouteIcon from "@mui/icons-material/Route";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { BarChart } from "@mui/x-charts/BarChart";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { asArray, asObject } from "../utils/apiData.js";

const PING_INTERVAL_MS = 10000;

export default function BusDriverTripPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const { data: buses, loading } = useApiGet(
    schoolId ? `/schools/${schoolId}/buses` : null,
  );
  const {
    data: summaryData,
    loading: summaryLoading,
    error: summaryError,
  } = useApiGet(
    schoolId ? `/schools/${schoolId}/my-bus-dashboard-summary` : null,
  );
  const myBus = asArray(buses).find((b) => b.driver?.id === user.id);
  const summary = asArray(summaryData)[0] ?? null;
  const busSummary = summary?.bus;
  const tripSummary = summary?.trips;

  // Un trajet peut déjà être en cours (démarré avant un rechargement de
  // page, ou depuis un autre appareil) : sans ça, le bouton "Terminer" reste
  // injoignable — la page ne montre que le formulaire de démarrage, qui
  // échoue avec "un trajet est déjà en cours" sans offrir de sortie.
  const { data: activeTripData } = useApiGet(
    myBus ? `/schools/${schoolId}/buses/${myBus.id}/trip` : null,
  );

  const [direction, setDirection] = useState("1");
  const [trip, setTrip] = useState(null);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [lastPosition, setLastPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [resumedFor, setResumedFor] = useState(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function startWatching(tripId) {
    if (!navigator.geolocation) {
      setGeoError("Ce navigateur ne supporte pas la géolocalisation.");
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setGeoError(null);
        const { latitude, longitude } = position.coords;
        setLastPosition({ latitude, longitude });
        api
          .post(`/schools/${schoolId}/bus-trips/${tripId}/ping`, {
            latitude,
            longitude,
          })
          .catch(() => {});
      },
      () =>
        setGeoError(
          "Localisation refusée ou indisponible. Autorisez l'accès à la position pour ce site.",
        ),
      { enableHighAccuracy: true, maximumAge: PING_INTERVAL_MS },
    );
  }

  useEffect(() => {
    if (activeTripData?.trip && resumedFor !== activeTripData.trip.id) {
      setTrip(activeTripData.trip);
      setResumedFor(activeTripData.trip.id);
      startWatching(activeTripData.trip.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTripData]);

  async function handleStart(e) {
    e.preventDefault();
    setError(null);
    setStarting(true);
    try {
      const response = await api.post(
        `/schools/${schoolId}/buses/${myBus.id}/trips/start`,
        { direction: Number(direction) },
      );
      setTrip(response.data);
      startWatching(response.data.id);
    } catch (err) {
      setError(
        err.response?.data?.message || "Impossible de démarrer le trajet.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function handleEnd() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    await api.post(`/schools/${schoolId}/bus-trips/${trip.id}/end`);
    setTrip(null);
    setLastPosition(null);
  }

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  if (loading || summaryLoading)
    return <Typography color="text.secondary">Chargement...</Typography>;

  if (!myBus) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">
          Aucun bus ne vous est assigné pour l'instant.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Tableau de bord chauffeur
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {myBus.label} {myBus.plate_number ? `(${myBus.plate_number})` : ""}
      </Typography>

      {summaryError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summaryError}
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <RouteIcon color="primary" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Trajets ce mois
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {tripSummary?.month_count ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <CheckCircleIcon color="success" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Trajets terminés
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {tripSummary?.completed_count ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <LocationOnIcon color="info" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Arrêts desservis
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {tripSummary?.reached_stops_count ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <DirectionsBusIcon color="warning" />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Arrêts du bus
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {busSummary?.stops_count ?? 0}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ px: 1, pt: 1 }}>
          Activité de mes trajets
        </Typography>
        <BarChart
          height={220}
          hideLegend
          series={[
            {
              data: [
                tripSummary?.month_count ?? 0,
                tripSummary?.completed_count ?? 0,
                tripSummary?.reached_stops_count ?? 0,
              ],
              label: "Total",
            },
          ]}
          xAxis={[
            { scaleType: "band", data: ["Trajets", "Terminés", "Arrêts"] },
          ]}
          yAxis={[{ min: 0 }]}
          grid={{ horizontal: true }}
          margin={{ left: 45, right: 20 }}
        />
      </Paper>

      <Typography variant="h6" gutterBottom>
        Gestion du trajet
      </Typography>
      {!trip && (
        <Card variant="outlined">
          <CardContent>
            <Box
              component="form"
              onSubmit={handleStart}
              sx={{ display: "flex", flexDirection: "column", gap: 2 }}
            >
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                select
                label="Direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value)}
                fullWidth
              >
                <MenuItem value="1">Ramassage (vers l'école)</MenuItem>
                <MenuItem value="2">Retour (vers les arrêts)</MenuItem>
              </TextField>
              <Button
                type="submit"
                variant="contained"
                startIcon={<DirectionsBusIcon />}
                disabled={starting}
              >
                {starting ? "Démarrage..." : "Démarrer le trajet"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {trip && (
        <Card variant="outlined">
          <CardContent sx={{ textAlign: "center" }}>
            <Typography variant="h6" color="success.main" gutterBottom>
              Trajet en cours
            </Typography>
            {geoError && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {geoError}
              </Alert>
            )}
            {lastPosition ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Position envoyée : {lastPosition.latitude.toFixed(5)},{" "}
                {lastPosition.longitude.toFixed(5)}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                En attente de la position GPS...
              </Typography>
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Gardez cette page ouverte et l'écran allumé pendant le trajet.
            </Typography>
            <Stack direction="row" spacing={2} justifyContent="center">
              <Button variant="outlined" color="error" onClick={handleEnd}>
                Terminer le trajet
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
