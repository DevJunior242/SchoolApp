import { Component } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Typography,
} from "@mui/material";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper variant="outlined" sx={{ p: 4 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            Impossible d'afficher cette page.
          </Alert>
          <Typography variant="h6" gutterBottom>
            Une erreur est survenue
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Rechargez la page. Si le problème persiste, vérifiez votre connexion
            ou contactez l'administrateur.
          </Typography>
          <Box>
            <Button variant="contained" onClick={this.handleReload}>
              Recharger la page
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }
}
