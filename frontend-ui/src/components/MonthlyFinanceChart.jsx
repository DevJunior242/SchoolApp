import { Paper, Typography, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

// Bleu/orange validés (contraste + daltonisme) pour cette paire de séries
// catégorielles — mêmes teintes en clair/sombre, juste l'étape adaptée à
// chaque surface.
const COLORS = {
  light: { payments: '#2a78d6', expenses: '#eb6834' },
  dark: { payments: '#3987e5', expenses: '#d95926' },
};

function fmt(n) {
  return `${Number(n ?? 0).toLocaleString()} FCFA`;
}

/**
 * Recettes vs dépenses confirmées, mois par mois — le tableau de bord
 * directeur n'affichait jusqu'ici que des chiffres isolés (ce mois, total),
 * jamais une tendance dans le temps.
 */
export default function MonthlyFinanceChart({ data }) {
  const theme = useTheme();
  const colors = theme.palette.mode === 'dark' ? COLORS.dark : COLORS.light;

  if (!data || data.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h6" gutterBottom>
        Recettes vs dépenses (6 derniers mois)
      </Typography>
      <BarChart
        height={280}
        borderRadius={4}
        series={[
          {
            data: data.map((d) => d.payments),
            label: 'Recettes',
            color: colors.payments,
            valueFormatter: fmt,
          },
          {
            data: data.map((d) => d.expenses),
            label: 'Dépenses',
            color: colors.expenses,
            valueFormatter: fmt,
          },
        ]}
        xAxis={[{ scaleType: 'band', data: data.map((d) => d.label) }]}
        grid={{ horizontal: true }}
        margin={{ left: 70 }}
      />
    </Paper>
  );
}
