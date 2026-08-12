import { Box, Button, Stack, Typography } from "@mui/material";
import { motion } from "motion/react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import intellinoMark from "../assets/intellino-mark.svg";

export default function NotFoundPage() {
  const { user } = useAuth();

  return (
    <Box
      sx={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: 2,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Box
          component="img"
          src={intellinoMark}
          alt="Intellino"
          sx={{ height: 56, width: 56, borderRadius: "14px", mb: 3 }}
        />
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: "3.5rem", sm: "5rem" },
            lineHeight: 1,
            color: "primary.main",
          }}
        >
          404
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 2, mb: 1 }}>
          Page introuvable
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 420 }}>
          Cette page n'existe pas ou a été déplacée. Vérifiez l'adresse, ou revenez à un endroit connu.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
          <Button component={RouterLink} to="/" variant="outlined">
            Retour à l'accueil
          </Button>
          <Button component={RouterLink} to={user ? "/dashboard" : "/login"} variant="contained">
            {user ? "Tableau de bord" : "Connexion"}
          </Button>
        </Stack>
      </motion.div>
    </Box>
  );
}
