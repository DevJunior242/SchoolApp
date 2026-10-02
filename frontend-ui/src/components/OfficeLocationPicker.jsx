import { useEffect, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Alert,
  Box,
  Button,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  Slider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

// Vue satellite Esri (clé API ArcGIS Location Platform, gratuite ; restreinte au
// domaine du site dans le compte Esri). Sans clé : plan OpenStreetMap seul.
const ESRI_KEY = import.meta.env.VITE_ESRI_API_KEY || "";
const ESRI_ATTRIBUTION = 'Imagerie &copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics';

// Ouagadougou par défaut tant que l'établissement n'est pas placé.
const DEFAULT_CENTER = [12.3714, -1.5197];

function hasPosition(latitude, longitude) {
  return latitude !== "" && latitude != null && longitude !== "" && longitude != null && !Number.isNaN(Number(latitude));
}

/** Clic sur la carte = nouvelle position de l'établissement. */
function ClickToPlace({ onPlace }) {
  useMapEvents({
    click(event) {
      onPlace(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

/**
 * Cadre la carte sur le cercle entier quand la position ou le rayon change :
 * avec un grand rayon, on se retrouvait « dans » le cercle sans le voir.
 */
function FollowPosition({ center, radius }) {
  const map = useMap();
  useEffect(() => {
    if (!center) return;
    const bounds = L.latLng(center[0], center[1]).toBounds((Number(radius) || 150) * 2);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 });
  }, [center?.[0], center?.[1], radius]); // eslint-disable-line react-hooks/exhaustive-deps
  // La carte peut naître dans un bloc qui s'ouvre : on recalcule sa taille.
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

/**
 * Position de l’établissement pour le contrôle GPS du personnel (repris d’Intellino RH) : on clique sur la carte (ou on
 * cherche l'adresse) au lieu de saisir latitude et longitude, que presque
 * personne ne connaît. Le cercle montre la zone où un pointage est « à l’établissement ».
 */
export default function OfficeLocationPicker({ latitude, longitude, radius, onChange, onRadiusChange, locateButton }) {
  const placed = hasPosition(latitude, longitude);
  const center = placed ? [Number(latitude), Number(longitude)] : null;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  // Satellite par défaut quand il est disponible : on y reconnaît son bâtiment.
  const [basemap, setBasemap] = useState(ESRI_KEY ? "satellite" : "plan");

  function place(lat, lng) {
    onChange({ latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)) });
  }

  async function search() {
    if (query.trim().length < 3) return;
    setSearching(true);
    setSearchError("");
    try {
      // OpenStreetMap (Nominatim) : gratuit, sans clé, usage raisonnable (une recherche à la fois).
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=fr&q=${encodeURIComponent(query.trim())}`;
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setResults(list);
      if (list.length === 0) setSearchError("Aucun lieu trouvé : essayez avec le quartier et la ville, ou cliquez directement sur la carte.");
    } catch {
      setSearchError("Recherche impossible pour le moment : cliquez directement sur la carte.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Cliquez sur la carte à l’emplacement de l’établissement, cherchez son adresse, ou utilisez votre position si vous y êtes.
        Le cercle orange montre la zone où un pointage est considéré « à l’établissement ».
      </Typography>

      {/* Pas de <form> ici : ce bloc est déjà dans le formulaire des règles de
          pointage (un formulaire dans un formulaire rechargeait la page). */}
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <TextField
          size="small"
          fullWidth
          label="Chercher une adresse"
          placeholder="Ex. Ouaga 2000, Ouagadougou"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Entrée = chercher, sans enregistrer les règles.
            if (event.key === "Enter") {
              event.preventDefault();
              search();
            }
          }}
        />
        <Button type="button" onClick={search} variant="outlined" startIcon={<SearchIcon />} disabled={searching} sx={{ flexShrink: 0 }}>
          {searching ? "…" : "Chercher"}
        </Button>
      </Box>
      {searchError && (
        <Alert severity="info" sx={{ mb: 1 }} onClose={() => setSearchError("")}>
          {searchError}
        </Alert>
      )}
      {results.length > 0 && (
        <List dense sx={{ mb: 1, border: 1, borderColor: "divider", borderRadius: 2, maxHeight: 180, overflowY: "auto" }}>
          {results.map((result) => (
            <ListItemButton
              key={result.place_id}
              onClick={() => {
                place(Number(result.lat), Number(result.lon));
                setResults([]);
              }}
            >
              <ListItemText primary={result.display_name} slotProps={{ primary: { variant: "body2" } }} />
            </ListItemButton>
          ))}
        </List>
      )}

      {ESRI_KEY && (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={basemap}
          onChange={(_, value) => value && setBasemap(value)}
          aria-label="Type de carte"
          sx={{ mb: 1 }}
        >
          <ToggleButton value="satellite">Satellite</ToggleButton>
          <ToggleButton value="plan">Plan</ToggleButton>
        </ToggleButtonGroup>
      )}

      <Box sx={{ height: 300, borderRadius: 3, overflow: "hidden", border: 1, borderColor: "divider", mb: 1.5 }}>
        <MapContainer center={center || DEFAULT_CENTER} zoom={center ? 17 : 12} style={{ height: "100%", width: "100%" }}>
          {basemap === "satellite" && ESRI_KEY ? (
            <>
              <TileLayer
                key="esri-imagery"
                attribution={ESRI_ATTRIBUTION}
                url={`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${ESRI_KEY}`}
                maxZoom={19}
              />
              {/* Noms des lieux et des quartiers par-dessus la photo. */}
              <TileLayer
                key="esri-labels"
                url={`https://ibasemaps-api.arcgis.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}?token=${ESRI_KEY}`}
                maxZoom={19}
              />
            </>
          ) : (
            <TileLayer
              key="osm"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}
          <ClickToPlace onPlace={place} />
          <FollowPosition center={center} radius={radius} />
          {center && (
            <>
              <Circle center={center} radius={Number(radius) || 150} pathOptions={{ color: "#F3680F", fillColor: "#F3680F", fillOpacity: 0.15 }} />
              <CircleMarker center={center} radius={7} pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#D9560A", fillOpacity: 1 }} />
            </>
          )}
        </MapContainer>
      </Box>

      {/* Légende : ce que montrent le point et le cercle (le reste vient d'OpenStreetMap). */}
      <Stack direction="row" spacing={2.5} useFlexGap sx={{ flexWrap: "wrap", alignItems: "center", mb: 1.5 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#D9560A", border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,.25)" }} />
          <Typography variant="body2">Établissement{placed ? "" : " (pas encore placé)"}</Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #F3680F", bgcolor: "rgba(243,104,15,.15)" }} />
          <Typography variant="body2">Zone acceptée : {Number(radius) || 150} m autour</Typography>
        </Stack>
        <Typography variant="caption" color="text.secondary">
          Les autres symboles (pharmacies, écoles, rues…) sont des repères de la carte.
        </Typography>
      </Stack>

      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Rayon accepté : {Number(radius) || 150} m
      </Typography>
      <Slider
        value={Number(radius) || 150}
        min={20}
        max={1000}
        step={10}
        onChange={(_, value) => onRadiusChange(value)}
        aria-label="Rayon accepté autour de l’établissement"
        sx={{ mb: 0.5 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        Le GPS est imprécis à l’intérieur des bâtiments : gardez au moins 100 à 150 m.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        {locateButton}
        <Button type="button" size="small" onClick={() => setAdvanced((previous) => !previous)}>
          {advanced ? "Masquer les coordonnées" : "Saisir les coordonnées (avancé)"}
        </Button>
      </Stack>
      <Collapse in={advanced}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
          <TextField
            size="small"
            label="Latitude"
            type="number"
            value={latitude ?? ""}
            onChange={(event) => onChange({ latitude: event.target.value, longitude })}
            slotProps={{ htmlInput: { step: "any" } }}
          />
          <TextField
            size="small"
            label="Longitude"
            type="number"
            value={longitude ?? ""}
            onChange={(event) => onChange({ latitude, longitude: event.target.value })}
            slotProps={{ htmlInput: { step: "any" } }}
          />
        </Stack>
      </Collapse>
    </Box>
  );
}
