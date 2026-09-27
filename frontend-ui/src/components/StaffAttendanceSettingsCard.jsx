import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import WifiIcon from "@mui/icons-material/Wifi";
import api from "../api/axios.jsx";
import { getApiErrorMessage } from "../utils/apiData.js";
import { getCurrentPosition } from "../utils/staffDevice.js";

function toForm(settings) {
  return {
    qr_mode: settings?.qr_mode || "rotating",
    require_network: Boolean(settings?.require_network),
    require_device: Boolean(settings?.require_device),
    require_gps: Boolean(settings?.require_gps),
    allowed_networks: settings?.allowed_networks || [],
    latitude: settings?.latitude ?? "",
    longitude: settings?.longitude ?? "",
    radius_meters: settings?.radius_meters ?? 150,
  };
}

// Le parent remonte ce composant (prop key) quand les règles changent côté
// serveur, pour repartir d'un formulaire à jour.
export default function StaffAttendanceSettingsCard({ schoolId, settings, onSaved }) {
  const [form, setForm] = useState(() => toForm(settings));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  const printed = form.qr_mode === "printed";
  const currentNetwork = settings?.current_network;
  const alreadyAdded = form.allowed_networks.some(
    (network) => network.address === currentNetwork,
  );

  function update(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function addCurrentNetwork() {
    if (!currentNetwork || alreadyAdded) return;
    update("allowed_networks", [
      ...form.allowed_networks,
      { address: currentNetwork, label: "Wi-Fi du bureau" },
    ]);
  }

  function updateNetwork(index, field, value) {
    update(
      "allowed_networks",
      form.allowed_networks.map((network, i) =>
        i === index ? { ...network, [field]: value } : network,
      ),
    );
  }

  async function useMyPosition() {
    setLocating(true);
    setError("");
    const position = await getCurrentPosition();
    setLocating(false);
    if (!position) {
      setError(
        "Impossible d’obtenir votre position. Autorisez la localisation et réessayez depuis le bureau.",
      );
      return;
    }
    setForm((previous) => ({
      ...previous,
      latitude: Number(position.latitude.toFixed(7)),
      longitude: Number(position.longitude.toFixed(7)),
    }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.put(`/schools/${schoolId}/hr/attendance/settings`, {
        ...form,
        latitude: form.latitude === "" ? null : form.latitude,
        longitude: form.longitude === "" ? null : form.longitude,
      });
      setSuccess("Règles de pointage enregistrées.");
      onSaved?.(response.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Impossible d’enregistrer les règles."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent component="form" onSubmit={save}>
        <Typography variant="h6" gutterBottom>
          Règles de pointage
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Typography fontWeight={600}>Affichage du QR</Typography>
        <RadioGroup
          value={form.qr_mode}
          onChange={(event) => update("qr_mode", event.target.value)}
          sx={{ mb: 2 }}
        >
          <FormControlLabel
            value="rotating"
            control={<Radio />}
            label="QR sur écran, renouvelé automatiquement (le plus sûr)"
          />
          <FormControlLabel
            value="printed"
            control={<Radio />}
            label="QR imprimé et collé à l’administration (aucun écran à acheter, moins sûr)"
          />
        </RadioGroup>
        {printed && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Un QR imprimé peut être photographié. En mode imprimé, le Wi-Fi du
            bureau et le téléphone de chaque employé sont donc toujours vérifiés.
          </Alert>
        )}

        <Stack spacing={1} sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={printed || form.require_network}
                disabled={printed}
                onChange={(event) => update("require_network", event.target.checked)}
              />
            }
            label="Exiger le Wi-Fi du bureau (pointage refusé depuis un autre réseau)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={printed || form.require_device}
                disabled={printed}
                onChange={(event) => update("require_device", event.target.checked)}
              />
            }
            label="Un seul téléphone par employé (pointage refusé depuis un autre téléphone)"
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.require_gps}
                onChange={(event) => update("require_gps", event.target.checked)}
              />
            }
            label="Vérifier la position GPS (pointage accepté mais signalé suspect hors zone)"
          />
        </Stack>

        <Typography fontWeight={600} gutterBottom>
          Réseaux du bureau
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Connectez-vous au Wi-Fi du bureau puis ajoutez le réseau détecté.
          Réseau actuellement détecté : <strong>{currentNetwork || "inconnu"}</strong>
        </Typography>
        <Stack spacing={1} sx={{ mb: 1 }}>
          {form.allowed_networks.map((network, index) => (
            <Stack key={index} direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                size="small"
                label="Adresse réseau"
                value={network.address}
                onChange={(event) => updateNetwork(index, "address", event.target.value.trim())}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Nom"
                value={network.label || ""}
                onChange={(event) => updateNetwork(index, "label", event.target.value)}
                sx={{ flex: 1 }}
              />
              <IconButton
                aria-label="Retirer ce réseau"
                onClick={() =>
                  update(
                    "allowed_networks",
                    form.allowed_networks.filter((_, i) => i !== index),
                  )
                }
              >
                <DeleteIcon />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Button
          startIcon={<WifiIcon />}
          onClick={addCurrentNetwork}
          disabled={!currentNetwork || alreadyAdded}
          sx={{ mb: 2 }}
        >
          {alreadyAdded ? "Réseau actuel déjà ajouté" : "Ajouter le réseau actuel"}
        </Button>

        {form.require_gps && (
          <Box sx={{ mb: 2 }}>
            <Typography fontWeight={600} gutterBottom>
              Position du bureau
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1 }}>
              <TextField
                size="small"
                label="Latitude"
                type="number"
                value={form.latitude}
                onChange={(event) => update("latitude", event.target.value)}
              />
              <TextField
                size="small"
                label="Longitude"
                type="number"
                value={form.longitude}
                onChange={(event) => update("longitude", event.target.value)}
              />
              <TextField
                size="small"
                label="Rayon (mètres)"
                type="number"
                value={form.radius_meters}
                onChange={(event) => update("radius_meters", Number(event.target.value))}
              />
            </Stack>
            <Button startIcon={<MyLocationIcon />} onClick={useMyPosition} disabled={locating}>
              {locating ? "Localisation..." : "Utiliser ma position actuelle (depuis le bureau)"}
            </Button>
          </Box>
        )}

        <Box>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer les règles"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
