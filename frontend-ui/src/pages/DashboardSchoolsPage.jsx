import { useState } from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardActionArea,
    CardContent,
    Chip,
    Grid,
    Paper,
    Stack,
    Typography,
} from "@mui/material";
import { motion } from "motion/react";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "../context/AuthContext.jsx";
import { useSchools } from "../hooks/useSchools.js";
import CreateSchoolModal from "../components/CreateSchoolModal.jsx";

export default function DashboardSchoolsPage() {
    const { user } = useAuth();
    const { schoolUsers, loading, error, switchSchool, reload } = useSchools();
    const [createSchoolOpen, setCreateSchoolOpen] = useState(false);

    if (loading)
        return <Typography color="text.secondary">Chargement...</Typography>;

    return (
        <Box>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}
            <Paper
                sx={{
                    p: { xs: 3, md: 4 },
                    mb: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "rgba(255,255,255,0.03)",
                }}
            >
                <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Mes écoles
                        </Typography>
                        <Typography color="text.secondary">
                            Cliquez sur une école pour en faire votre école active.
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setCreateSchoolOpen(true)}
                        sx={{ flexShrink: 0 }}
                    >
                        Créer une école
                    </Button>
                </Stack>
            </Paper>

            <Grid container spacing={2}>
                {schoolUsers.map((su, i) => (
                    <Grid key={su.id} size={{ xs: 12, sm: 6, md: 4 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: i * 0.05 }}
                        >
                            <Card
                                variant="outlined"
                                sx={{
                                    height: "100%",
                                    bgcolor: "rgba(255,255,255,0.025)",
                                    borderColor: "divider",
                                }}
                            >
                                <CardActionArea
                                    onClick={() => switchSchool(su.school.id)}
                                    sx={{ p: 1 }}
                                >
                                    <CardContent>
                                        <Stack
                                            direction="row"
                                            sx={{
                                                justifyContent: "space-between",
                                                alignItems: "flex-start",
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="subtitle1">
                                                    {su.school.name}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                >
                                                    {su.school.country?.name} ·{" "}
                                                    {su.role?.name}
                                                </Typography>
                                            </Box>
                                            {user.current_school_id ===
                                                su.school.id && (
                                                <Chip
                                                    label="Active"
                                                    color="primary"
                                                    size="small"
                                                />
                                            )}
                                        </Stack>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
                {schoolUsers.length === 0 && (
                    <Grid size={12}>
                        <Paper
                            sx={{
                                p: 3,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "rgba(255,255,255,0.03)",
                            }}
                        >
                            <Typography color="text.secondary">
                                Vous n'appartenez à aucune école pour l'instant.
                            </Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            <CreateSchoolModal
                open={createSchoolOpen}
                onClose={() => setCreateSchoolOpen(false)}
                onCreated={reload}
                redirectToDashboard={false}
            />
        </Box>
    );
}
