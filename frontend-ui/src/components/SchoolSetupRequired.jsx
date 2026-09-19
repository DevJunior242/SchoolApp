import { Button, Paper, Stack, Typography } from "@mui/material";
import AddBusinessIcon from "@mui/icons-material/AddBusiness";
import { Link as RouterLink } from "react-router-dom";

export default function SchoolSetupRequired() {
  return (
    <Paper
      variant="outlined"
      sx={{
        maxWidth: 720,
        mx: "auto",
        p: { xs: 3, sm: 5 },
        textAlign: "center",
      }}
    >
      <Stack spacing={2} sx={{ alignItems: "center" }}>
        <AddBusinessIcon color="primary" sx={{ fontSize: 48 }} />
        <Typography variant="h4" fontWeight={700}>
          Configurez votre école
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 520 }}>
          Les fonctionnalités de gestion seront disponibles dès que vous aurez
          créé ou rejoint une école.
        </Typography>
        <Button
          component={RouterLink}
          to="/create-school"
          variant="contained"
          size="large"
          startIcon={<AddBusinessIcon />}
        >
          Créer mon école
        </Button>
      </Stack>
    </Paper>
  );
}
