import { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import api from '../api/axios.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiGet } from '../hooks/useApiGet.js';

function timeLabel(dateString) {
  return new Date(dateString).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DashboardMessagesPage() {
  const { user } = useAuth();
  const schoolId = user.current_school_id;
  const theme = useTheme();
  // Liste + conversation côte à côte (320px fixe + le reste) tiennent mal
  // sur mobile. En dessous de "sm", un seul panneau visible à la fois —
  // la liste, puis la conversation en plein écran avec un retour — comme
  // une appli de messagerie mobile classique.
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: threads, loading: threadsLoading, reload: reloadThreads } = useApiGet(
    schoolId ? `/schools/${schoolId}/messages/inbox` : null
  );

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [thread, setThread] = useState(null);
  const [threadLoading, setThreadLoading] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  // `silent: true` pour le polling en arrière-plan (voir plus bas) : on ne
  // veut pas faire clignoter le spinner de chargement au-dessus des messages
  // déjà affichés toutes les quelques secondes.
  async function loadThread(userId, { silent = false } = {}) {
    if (!silent) setThreadLoading(true);
    try {
      const response = await api.get(`/schools/${schoolId}/messages/threads/${userId}`);
      setThread(response.data);
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }

  function handleSelect(userId) {
    setSelectedUserId(userId);
    loadThread(userId);
    reloadThreads();
  }

  // Tant qu'un fil est ouvert, on le repolle (ainsi que la liste, pour ses
  // badges "non lu"/dernier message) : sans ça, un message reçu pendant que
  // la conversation est déjà affichée n'apparaît qu'après avoir recliqué sur
  // le fil.
  useEffect(() => {
    if (!selectedUserId) return undefined;

    const interval = setInterval(() => {
      loadThread(selectedUserId, { silent: true });
      reloadThreads();
    }, 8000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  async function handleSend() {
    const trimmed = body.trim();
    if (!trimmed || !selectedUserId) return;
    setSending(true);
    try {
      await api.post(`/schools/${schoolId}/messages/threads/${selectedUserId}`, { body: trimmed });
      setBody('');
      await loadThread(selectedUserId);
      await reloadThreads();
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(messageId) {
    await api.delete(`/schools/${schoolId}/messages/${messageId}`);
    await loadThread(selectedUserId, { silent: true });
    await reloadThreads();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Messages
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 220px)' }}>
        {(!isMobile || !selectedUserId) && (
          <Paper variant="outlined" sx={{ width: { xs: '100%', sm: 320 }, flexShrink: 0, overflowY: 'auto' }}>
            {threadsLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            )}
            {!threadsLoading && (threads ?? []).length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: 'center' }}>
                Aucun message pour le moment.
              </Typography>
            )}
            <List disablePadding>
              {(threads ?? []).map((t) => (
                <ListItemButton
                  key={t.user?.id}
                  selected={selectedUserId === t.user?.id}
                  onClick={() => handleSelect(t.user?.id)}
                  alignItems="flex-start"
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main', color: 'background.default' }}>
                      {t.user?.fullname?.charAt(0).toUpperCase()}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={t.unread_count > 0 ? 700 : 500} noWrap>
                          {t.user?.fullname}
                        </Typography>
                        {t.unread_count > 0 && <Chip label={t.unread_count} size="small" color="primary" />}
                      </Stack>
                    }
                    secondary={t.last_message}
                    slotProps={{ secondary: { noWrap: true, variant: 'caption' } }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}

        {(!isMobile || selectedUserId) && (
          <Paper variant="outlined" sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {!selectedUserId && (
              <Box sx={{ m: 'auto', textAlign: 'center', color: 'text.secondary' }}>
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">Sélectionnez un fil pour l'afficher.</Typography>
              </Box>
            )}
            {selectedUserId && (
              <>
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isMobile && (
                    <IconButton size="small" onClick={() => setSelectedUserId(null)} aria-label="Retour" sx={{ ml: -1 }}>
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Typography variant="subtitle2" fontWeight={700}>
                    {thread?.user?.fullname ?? '…'}
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, overflowY: 'auto', px: 2, py: 1.5 }}>
                  {threadLoading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={24} />
                    </Box>
                  )}
                  <Stack spacing={1.5}>
                    {(thread?.messages ?? []).map((m) => {
                      const fromUser = m.sender_id === m.user_id;
                      // Un fil peut recevoir des réponses de plusieurs membres
                      // du staff (directeur ET secrétariat) : "pas envoyé par
                      // le client" ne veut pas dire "envoyé par moi".
                      const mine = m.sender_id === user.id;
                      return (
                        <Box key={m.id} sx={{ display: 'flex', justifyContent: fromUser ? 'flex-start' : 'flex-end' }}>
                          <Box
                            sx={{
                              maxWidth: '75%',
                              px: 1.5,
                              py: 1,
                              borderRadius: 2,
                              bgcolor: fromUser ? 'action.hover' : 'primary.main',
                              color: fromUser ? 'text.primary' : 'background.default',
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
                                  onClick={() => handleDeleteMessage(m.id)}
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
                </Box>
                <Box sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Votre réponse..."
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
            )}
          </Paper>
        )}
      </Box>
    </Box>
  );
}
