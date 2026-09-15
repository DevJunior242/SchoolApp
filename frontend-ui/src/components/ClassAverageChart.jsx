import { Paper, Typography, useTheme } from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";

const COLOR = { light: "#2a78d6", dark: "#3987e5" };

function fmt(n) {
  return `${n}/20`;
}

/**
 * Moyenne générale par classe enseignée par le professeur connecté.
 */
export default function ClassAverageChart({ data }) {
  const theme = useTheme();
  const color = theme.palette.mode === "dark" ? COLOR.dark : COLOR.light;

  if (!data || data.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography variant="h6" gutterBottom>
        Moyenne par classe
      </Typography>
      <BarChart
        height={260}
        borderRadius={4}
        hideLegend
        series={[
          {
            data: data.map((d) => d.moyenne),
            label: "Moyenne",
            color,
            valueFormatter: fmt,
          },
        ]}
        xAxis={[{ scaleType: "band", data: data.map((d) => d.classe) }]}
        yAxis={[{ min: 0, max: 20 }]}
        grid={{ horizontal: true }}
        margin={{ left: 50 }}
      />
    </Paper>
  );
}
