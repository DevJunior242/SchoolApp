import { useEffect, useState } from "react";
import {
  Box,
  Fab,
  Paper,
  Stack,
  Typography,
  IconButton,
  Button,
  TextField,
  Autocomplete,
  Avatar,
  CircularProgress,
  Divider,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SchoolIcon from "@mui/icons-material/School";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import SellIcon from "@mui/icons-material/Sell";
import LoginIcon from "@mui/icons-material/Login";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import { useNavigate } from "react-router-dom";
import api from "../api/axios.jsx";
import EnrollmentRequestModal from "./EnrollmentRequestModal.jsx";

// Réponses tirées telles quelles du contenu déjà publié sur la page (sections
// Fonctionnalités / Notre approche / Tarifs) : pas de chiffre ni de promesse
// inventés pour ce bot.
const FAQ = [
  {
    q: "Quelles fonctionnalités sont incluses ?",
    r: "Gestion des établissements (inscriptions, classes, emplois du temps), suivi pédagogique (notes, présences, bulletins), communication SMS/WhatsApp aux familles, paiement de la scolarité, mode hors-ligne, et rapports pour l'État.",
  },
  {
    q: "Est-ce que ça fonctionne avec une connexion instable ?",
    r: "Oui : les présences et notes fonctionnent en mode hors-ligne et se synchronisent automatiquement dès que la connexion revient.",
  },
  {
    q: "Quels moyens de paiement pour la scolarité ?",
    r: "Orange Money, Moov Money et espèces suivies, avec reçus automatiques.",
  },
  {
    q: "Comment les parents suivent-ils la scolarité de leur enfant ?",
    r: "Notes, présences et bulletins sont mis à jour en temps réel et consultables directement par les parents depuis leur compte.",
  },
  {
    q: "Quels types d'établissements sont pris en charge ?",
    r: "Écoles maternelles, primaires et secondaires — Intellino est utilisé du maternel au secondaire.",
  },
  {
    q: "Dans quelles langues est l'assistance ?",
    r: "En français, avec des ressources en mooré et en dioula pour les familles.",
  },
  {
    q: "Comment se passe la mise en place pour mon établissement ?",
    r: "Notre équipe vous accompagne pour la mise en place, la formation du personnel et le suivi une fois votre espace créé.",
  },
  {
    q: "J'ai déjà un compte, comment me connecter ?",
    r: "Utilisez le bouton « Se connecter à mon compte » sur l'écran d'accueil de cet assistant, ou le lien Connexion en haut de la page.",
  },
  {
    q: "Quels sont les tarifs ?",
    r: "Trois paliers selon la taille de votre établissement : École (25 000 FCFA/mois, jusqu'à 150 élèves), Établissement (60 000 FCFA/mois, 151 à 500 élèves) et Réseau scolaire (120 000 FCFA/mois, 500+ élèves ou plusieurs écoles). Détail complet sur la page Tarifs.",
  },
  {
    q: "Y a-t-il un essai gratuit ?",
    r: "Oui, 30 jours d'essai gratuit sur tous les paliers, sans engagement.",
  },
  {
    q: "Comment se passe le paiement des tarifs ?",
    r: "Par Orange Money, Moov Money ou virement. Le paiement est confirmé manuellement par notre équipe.",
  },
  {
    q: "Puis-je changer de palier plus tard ?",
    r: "Oui, contactez-nous quand l'effectif de votre établissement évolue — vos données restent intactes lors du changement.",
  },
];

function BulleBot({ children }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
      <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.main" }}>
        <SmartToyIcon sx={{ fontSize: 16 }} />
      </Avatar>
      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: "action.hover", maxWidth: "85%" }}>
        <Typography variant="body2">{children}</Typography>
      </Paper>
    </Stack>
  );
}

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const [ouvert, setOuvert] = useState(false);
  const [etape, setEtape] = useState("accueil");

  const [ecoles, setEcoles] = useState([]);
  const [chargementEcoles, setChargementEcoles] = useState(false);
  const [ecole, setEcole] = useState(null);
  const [modalOuverte, setModalOuverte] = useState(false);

  useEffect(() => {
    if (!ouvert || ecoles.length || chargementEcoles) return;
    setChargementEcoles(true);
    api
      .get("/schools")
      .then((response) => setEcoles(response.data))
      .finally(() => setChargementEcoles(false));
  }, [ouvert, ecoles.length, chargementEcoles]);

  function fermer() {
    setOuvert(false);
    setEtape("accueil");
    setEcole(null);
  }

  function creerEcole() {
    navigate("/create-school");
    fermer();
  }

  function seConnecter() {
    navigate("/login");
    fermer();
  }

  function voirLesTarifs() {
    navigate("/pricing");
    fermer();
  }

  function allerAuContact() {
    fermer();
    // On est déjà sur la home : un simple scroll suffit, pas besoin de
    // navigation (même mécanisme que les liens d'ancre du header).
    setTimeout(() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  return (
    <>
      <Fab
        color="primary"
        onClick={() => setOuvert((v) => !v)}
        sx={{ position: "fixed", bottom: 24, right: 24, zIndex: 1300 }}
        aria-label="Assistant Intellino"
      >
        {ouvert ? <CloseIcon /> : <SmartToyIcon />}
      </Fab>

      {ouvert && (
        <Paper
          elevation={6}
          sx={{
            position: "fixed",
            bottom: 96,
            right: { xs: 16, sm: 24 },
            left: { xs: 16, sm: "auto" },
            width: { xs: "auto", sm: 360 },
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            borderRadius: 3,
            overflow: "hidden",
            zIndex: 1300,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", p: 2, bgcolor: "primary.main", color: "primary.contrastText" }}
          >
            {etape !== "accueil" && (
              <IconButton size="small" onClick={() => setEtape("accueil")} sx={{ color: "inherit" }}>
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <SmartToyIcon fontSize="small" />
            <Typography fontWeight={700} sx={{ flexGrow: 1 }}>
              Assistant Intellino
            </Typography>
            <IconButton size="small" onClick={fermer} sx={{ color: "inherit" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          <Stack spacing={2} sx={{ p: 2, overflowY: "auto", flexGrow: 1 }}>
            {etape === "accueil" && (
              <>
                <BulleBot>Bonjour 👋 Je suis l'assistant Intellino. Comment puis-je vous aider ?</BulleBot>
                <Stack spacing={1}>
                  <Button variant="outlined" startIcon={<LoginIcon />} onClick={seConnecter}>
                    Se connecter à mon compte
                  </Button>
                  <Button variant="outlined" startIcon={<SchoolIcon />} onClick={() => setEtape("ecole")}>
                    Trouver l'école de mon enfant
                  </Button>
                  <Button variant="outlined" startIcon={<AddBusinessIcon />} onClick={creerEcole}>
                    Créer l'espace de mon établissement
                  </Button>
                  <Button variant="outlined" startIcon={<SellIcon />} onClick={voirLesTarifs}>
                    Voir les tarifs
                  </Button>
                  <Button variant="outlined" startIcon={<HelpOutlineIcon />} onClick={() => setEtape("faq")}>
                    Questions fréquentes
                  </Button>
                  <Button variant="outlined" startIcon={<SupportAgentIcon />} onClick={() => setEtape("humain")}>
                    Parler à un humain
                  </Button>
                </Stack>
              </>
            )}

            {etape === "ecole" && (
              <>
                <BulleBot>Quelle école recherchez-vous ?</BulleBot>
                {chargementEcoles && !ecoles.length ? (
                  <Box sx={{ textAlign: "center", py: 2 }}>
                    <CircularProgress size={20} />
                  </Box>
                ) : (
                  <Autocomplete
                    size="small"
                    options={ecoles}
                    getOptionLabel={(s) => `${s.name}${s.city ? ` — ${s.city}` : ""}`}
                    value={ecole}
                    onChange={(_, v) => setEcole(v)}
                    noOptionsText="Aucune école trouvée"
                    renderInput={(params) => <TextField {...params} label="Nom de l'école" />}
                  />
                )}
                {ecole && (
                  <Stack spacing={1}>
                    <BulleBot>
                      Vous pouvez envoyer une demande de pré-inscription à {ecole.name}, l'établissement vous
                      recontactera directement.
                    </BulleBot>
                    <Button variant="contained" onClick={() => setModalOuverte(true)}>
                      Envoyer une demande de pré-inscription
                    </Button>
                  </Stack>
                )}
              </>
            )}

            {etape === "faq" && (
              <Stack spacing={1.5}>
                {FAQ.map((item) => (
                  <Box key={item.q}>
                    <Typography variant="body2" fontWeight={700}>
                      {item.q}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.r}
                    </Typography>
                    <Divider sx={{ mt: 1.5 }} />
                  </Box>
                ))}
              </Stack>
            )}

            {etape === "humain" && (
              <>
                <BulleBot>
                  Notre équipe vous répond sous 24h via le formulaire de contact en bas de page.
                </BulleBot>
                <Button variant="contained" onClick={allerAuContact}>
                  Aller au formulaire de contact
                </Button>
              </>
            )}
          </Stack>
        </Paper>
      )}

      <EnrollmentRequestModal
        open={modalOuverte}
        school={ecole}
        onClose={() => {
          setModalOuverte(false);
          fermer();
        }}
      />
    </>
  );
}
