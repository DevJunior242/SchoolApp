import { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api/axios.jsx';

function timeLabel(dateString) {
  return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fil de discussion "contacter l'école" de l'utilisateur connecté (non-staff).
 * Un seul fil par utilisateur : `mine` se déduit de sender_id === user_id,
 * puisque user_id est toujours le propriétaire du fil (moi).
 */
export default function ChatWidget({ anchorEl, onClose, schoolId, onRead }) {
  const open = Boolean(anchorEl);
  const theme = useTheme();
  // Popover ancré au bouton : sur mobile le clavier virtuel peut le décaler
  // ou masquer le champ de saisie, et il n'y a pas de zone visible en dehors
  // pour le fermer au doigt. En dessous de "sm", on passe donc à un Dialog
  // plein écran (repositionné par le navigateur avec le clavier, comme
  // n'importe quel modal) avec un bouton de fermeture explicite.
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // `silent: true` pour le polling en arrière-plan (voir plus bas) : on ne
  // veut pas faire clignoter le spinner de chargement au-dessus des messages
  // déjà affichés toutes les quelques secondes.
  async function loadThread({ silent = false } = {}) {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/schools/${schoolId}/messages`);
      setMessages(response.data);
      onRead?.();
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Tant que le fil est ouvert, on le repolle : sans ça, une réponse reçue
  // pendant que la conversation est déjà affichée n'apparaît qu'après avoir
  // rouvert le popover/dialog.
  useEffect(() => {
    if (!open) return undefined;

    const interval = setInterval(() => loadThread({ silent: true }), 8000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await api.post(`/schools/${schoolId}/messages`, { body: trimmed });
      setBody('');
      await loadThread();
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(messageId) {
    await api.delete(`/schools/${schoolId}/messages/${messageId}`);
    await loadThread();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const content = (
    <>
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ flex: 1 }}>
          Contacter l'école
        </Typography>
        {fullScreen && (
          <IconButton size="small" onClick={onClose} aria-label="Fermer">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        {!loading && messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            Envoyez un message à l'école : le directeur ou le secrétariat vous répondra ici.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {messages.map((m) => {
            const mine = m.sender_id === m.user_id;
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                <Box
                  sx={{
                    maxWidth: '80%',
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    bgcolor: mine ? 'primary.main' : 'action.hover',
                    color: mine ? 'background.default' : 'text.primary',
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.body}</Typography>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {timeLabel(m.created_at)}
                    </Typography>
                    {mine && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(m.id)}
                        aria-label="Retirer ce message"
                        sx={{ p: 0.25, ml: 1, color: 'inherit', opacity: 0.7 }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Stack>
        <div ref={bottomRef} />
      </Box>

      <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Votre message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={3}
        />
        <IconButton color="primary" onClick={handleSend} disabled={sending || !body.trim()}>
          <SendIcon />
        </IconButton>
      </Box>
    </>
  );

  if (fullScreen) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        slotProps={{
          paper: { sx: { display: 'flex', flexDirection: 'column' } },
        }}
      >
        {content}
      </Dialog>
    );
  }

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: {
          sx: {
            width: 360,
            maxWidth: 400,
            height: 460,
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      {content}
    </Popover>
  );
}
