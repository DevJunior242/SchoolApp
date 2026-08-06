import { useEffect, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Popover,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
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
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  async function loadThread() {
    setLoading(true);
    try {
      const response = await api.get(`/schools/${schoolId}/messages`);
      setMessages(response.data);
      onRead?.();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadThread();
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

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
            width: { xs: 'calc(100vw - 24px)', sm: 360 },
            maxWidth: 400,
            height: { xs: 'min(75vh, 460px)', sm: 460 },
            display: 'flex',
            flexDirection: 'column',
          },
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Contacter l'école
        </Typography>
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
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                    {timeLabel(m.created_at)}
                  </Typography>
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
    </Popover>
  );
}
