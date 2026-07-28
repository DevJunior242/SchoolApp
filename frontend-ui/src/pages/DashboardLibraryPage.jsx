import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import RestoreIcon from "@mui/icons-material/Restore";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import api from "../api/axios.jsx";
import BookCopyLabel from "../components/BookCopyLabel.jsx";
import LibraryServiceTab from "../components/LibraryServiceTab.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useApiGet } from "../hooks/useApiGet.js";
import { usePaginatedList } from "../hooks/usePaginatedList.js";

const COPY_STATUS_AVAILABLE = 1;
const COPY_STATUS_BORROWED = 2;
const COPY_STATUS_LOST = 3;

const RESERVATION_STATUS_LABELS = {
  1: { label: "En attente", color: "default" },
  2: { label: "Prête à retirer", color: "success" },
};

function emptyBookForm() {
  return {
    title: "",
    author: "",
    publisher: "",
    isbn: "",
    category: "",
    language: "",
    level_id: "",
    description: "",
    copies_count: 1,
  };
}

export default function DashboardLibraryPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;

  const [tab, setTab] = useState("service");

  if (!schoolId) {
    return (
      <Box sx={{ py: 8, textAlign: "center" }}>
        <Typography color="text.secondary">Aucune école active.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Bibliothèque
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 3 }}
        variant="scrollable"
        allowScrollButtonsMobile
      >
        <Tab value="service" label="Service" />
        <Tab value="catalogue" label="Catalogue" />
        <Tab value="reservations" label="Réservations" />
        <Tab value="documents" label="Documents" />
      </Tabs>

      {tab === "service" && <LibraryServiceTab schoolId={schoolId} />}
      {tab === "catalogue" && <CatalogueTab schoolId={schoolId} />}
      {tab === "reservations" && <ReservationsTab schoolId={schoolId} />}
      {tab === "documents" && <DocumentsTab schoolId={schoolId} />}
    </Box>
  );
}

function CatalogueTab({ schoolId }) {
  const { data: levels } = useApiGet("/levels");
  const {
    data: books,
    page,
    setPage,
    lastPage,
    search,
    setSearch,
    loading,
    reload,
  } = usePaginatedList(`/schools/${schoolId}/library/books`);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyBookForm());
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [managingBookId, setManagingBookId] = useState(null);
  const { data: managingBook, reload: reloadManagingBook } = useApiGet(
    managingBookId
      ? `/schools/${schoolId}/library/books/${managingBookId}`
      : null,
  );

  const [printingCopy, setPrintingCopy] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/schools/${schoolId}/library/books`, form);
      await reload();
      setDialogOpen(false);
      setForm(emptyBookForm());
    } catch (err) {
      const messages = err.response?.data?.errors;
      setError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible de créer ce livre.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteBook(id) {
    await api.delete(`/schools/${schoolId}/library/books/${id}`);
    if (managingBookId === id) setManagingBookId(null);
    await reload();
  }

  async function handleAddCopy() {
    await api.post(
      `/schools/${schoolId}/library/books/${managingBookId}/copies`,
      {},
    );
    await reloadManagingBook();
    await reload();
  }

  async function handleUpdateCopyStatus(copyId, status) {
    await api.put(`/schools/${schoolId}/library/copies/${copyId}`, { status });
    await reloadManagingBook();
    await reload();
  }

  async function handleDeleteCopy(copyId) {
    await api.delete(`/schools/${schoolId}/library/copies/${copyId}`);
    await reloadManagingBook();
    await reload();
  }

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <TextField
          size="small"
          placeholder="Rechercher un livre"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          Ajouter un livre
        </Button>
      </Stack>

      {loading ? (
        <Typography color="text.secondary">Chargement...</Typography>
      ) : (
        <Stack spacing={1.5}>
          {books.map((book) => (
            <Card key={book.id} variant="outlined">
              <CardContent
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  flexWrap: "wrap",
                }}
              >
                <Box
                  sx={{ flexGrow: 1, cursor: "pointer" }}
                  onClick={() => setManagingBookId(book.id)}
                >
                  <Typography variant="subtitle1">{book.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {book.author || "Auteur inconnu"}{" "}
                    {book.category ? `· ${book.category}` : ""} ·{" "}
                    {book.available_copies_count}/{book.copies_count}{" "}
                    disponible(s)
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteBook(book.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
          {books.length === 0 && (
            <Typography color="text.secondary">
              Aucun livre pour l'instant.
            </Typography>
          )}
        </Stack>
      )}

      {lastPage > 1 && (
        <Stack alignItems="center" sx={{ mt: 3 }}>
          <Pagination
            count={lastPage}
            page={page}
            onChange={(_, p) => setPage(p)}
          />
        </Stack>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Ajouter un livre</DialogTitle>
        <Box component="form" onSubmit={handleSubmit}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="Titre"
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              required
              fullWidth
              autoFocus
            />
            <TextField
              label="Auteur"
              value={form.author}
              onChange={(e) =>
                setForm((p) => ({ ...p, author: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Éditeur"
              value={form.publisher}
              onChange={(e) =>
                setForm((p) => ({ ...p, publisher: e.target.value }))
              }
              fullWidth
            />
            <TextField
              label="ISBN"
              value={form.isbn}
              onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Catégorie"
              placeholder="Roman, Manuel scolaire, BD..."
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              fullWidth
            />
            <TextField
              select
              label="Niveau conseillé (optionnel)"
              value={form.level_id}
              onChange={(e) =>
                setForm((p) => ({ ...p, level_id: e.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">Tous niveaux</MenuItem>
              {(levels ?? []).map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Nombre d'exemplaires"
              type="number"
              value={form.copies_count}
              onChange={(e) =>
                setForm((p) => ({ ...p, copies_count: e.target.value }))
              }
              slotProps={{ htmlInput: { min: 0, max: 100 } }}
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? "Création..." : "Créer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={!!managingBookId}
        onClose={() => setManagingBookId(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Exemplaires — {managingBook?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={1}>
            {managingBook?.copies?.map((copy, index) => (
              <Stack
                key={copy.id}
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <Typography sx={{ flexGrow: 1 }}>
                  Exemplaire {index + 1}
                </Typography>
                <Chip
                  size="small"
                  label={
                    copy.status === COPY_STATUS_AVAILABLE
                      ? "Disponible"
                      : copy.status === COPY_STATUS_BORROWED
                        ? "Emprunté"
                        : "Perdu"
                  }
                  color={
                    copy.status === COPY_STATUS_AVAILABLE
                      ? "success"
                      : copy.status === COPY_STATUS_LOST
                        ? "error"
                        : "default"
                  }
                />
                <IconButton
                  size="small"
                  onClick={() =>
                    setPrintingCopy({ id: copy.id, number: index + 1 })
                  }
                  title="Imprimer l'étiquette"
                >
                  <QrCode2Icon fontSize="small" />
                </IconButton>
                {copy.status === COPY_STATUS_AVAILABLE && (
                  <IconButton
                    size="small"
                    onClick={() =>
                      handleUpdateCopyStatus(copy.id, COPY_STATUS_LOST)
                    }
                    title="Marquer perdu"
                  >
                    <ReportProblemIcon fontSize="small" />
                  </IconButton>
                )}
                {copy.status === COPY_STATUS_LOST && (
                  <IconButton
                    size="small"
                    onClick={() =>
                      handleUpdateCopyStatus(copy.id, COPY_STATUS_AVAILABLE)
                    }
                    title="Retrouvé"
                  >
                    <RestoreIcon fontSize="small" />
                  </IconButton>
                )}
                {copy.status !== COPY_STATUS_BORROWED && (
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteCopy(copy.id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Button startIcon={<AddIcon />} onClick={handleAddCopy}>
            Ajouter un exemplaire
          </Button>
          <Button onClick={() => setManagingBookId(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!printingCopy}
        onClose={() => setPrintingCopy(null)}
        fullWidth
        maxWidth="xs"
      >
        <DialogContent>
          {printingCopy && (
            <BookCopyLabel
              copyId={printingCopy.id}
              bookTitle={managingBook?.title}
              copyNumber={printingCopy.number}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPrintingCopy(null)}>Fermer</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function ReservationsTab({ schoolId }) {
  const {
    data: reservations,
    loading,
    error,
  } = useApiGet(`/schools/${schoolId}/library/reservations`);

  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;
  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const list = reservations ?? [];

  return (
    <Stack spacing={1.5}>
      {list.map((reservation) => (
        <Card key={reservation.id} variant="outlined">
          <CardContent
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2">
                {reservation.book?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {reservation.student?.fullname} (
                {reservation.student?.matricule}) · réservé le{" "}
                {new Date(reservation.reserved_at).toLocaleDateString("fr-FR")}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={
                RESERVATION_STATUS_LABELS[reservation.status]?.label ??
                reservation.status
              }
              color={
                RESERVATION_STATUS_LABELS[reservation.status]?.color ??
                "default"
              }
            />
          </CardContent>
        </Card>
      ))}
      {list.length === 0 && (
        <Typography color="text.secondary">
          Aucune réservation en attente.
        </Typography>
      )}
    </Stack>
  );
}

function DocumentsTab({ schoolId }) {
  const { data: levels } = useApiGet("/levels");
  const {
    data: documents,
    loading,
    error,
    reload,
  } = useApiGet(`/schools/${schoolId}/library/documents`);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [levelId, setLevelId] = useState("");
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (levelId) formData.append("level_id", levelId);
      formData.append("file", file);
      await api.post(`/schools/${schoolId}/library/documents`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await reload();
      setDialogOpen(false);
      setTitle("");
      setLevelId("");
      setFile(null);
    } catch (err) {
      const messages = err.response?.data?.errors;
      setUploadError(
        messages
          ? Object.values(messages).flat().join(" ")
          : "Impossible d'envoyer ce document.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id) {
    await api.delete(`/schools/${schoolId}/library/documents/${id}`);
    await reload();
  }

  async function handleDownload(doc) {
    const response = await api.get(
      `/schools/${schoolId}/library/documents/${doc.id}/download`,
      { responseType: "blob" },
    );
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  if (loading)
    return <Typography color="text.secondary">Chargement...</Typography>;
  if (error) {
    return (
      <Alert severity="error" sx={{ maxWidth: 480 }}>
        {error}
      </Alert>
    );
  }

  const list = documents ?? [];

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: "flex-end", mb: 2 }}>
        <Button
          startIcon={<CloudUploadIcon />}
          variant="contained"
          onClick={() => setDialogOpen(true)}
        >
          Ajouter un document
        </Button>
      </Stack>

      <Stack spacing={1.5}>
        {list.map((doc) => (
          <Card key={doc.id} variant="outlined">
            <CardContent
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">{doc.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {doc.level ? doc.level?.name : "Tous niveaux"} ·{" "}
                  {doc.download_count} téléchargement(s)
                </Typography>
              </Box>
              <Button size="small" onClick={() => handleDownload(doc)}>
                Télécharger
              </Button>
              <IconButton size="small" onClick={() => handleDelete(doc.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Typography color="text.secondary">
            Aucun document pour l'instant.
          </Typography>
        )}
      </Stack>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Ajouter un document</DialogTitle>
        <Box component="form" onSubmit={handleUpload}>
          <DialogContent
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            {uploadError && <Alert severity="error">{uploadError}</Alert>}
            <TextField
              label="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              autoFocus
            />
            <TextField
              select
              label="Restreindre à un niveau (optionnel)"
              value={levelId}
              onChange={(e) => setLevelId(e.target.value)}
              fullWidth
            >
              <MenuItem value="">Tous niveaux</MenuItem>
              {(levels ?? []).map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            <Button component="label" variant="outlined">
              {file ? file.name : "Choisir un fichier PDF"}
              <input
                type="file"
                hidden
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                required
              />
            </Button>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={uploading || !file}
            >
              {uploading ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
