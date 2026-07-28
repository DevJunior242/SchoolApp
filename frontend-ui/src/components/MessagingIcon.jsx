import { useEffect, useState } from 'react';
import { Badge, IconButton } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.jsx';
import ChatWidget from './ChatWidget.jsx';

const POLL_INTERVAL_MS = 20000;

/**
 * Le directeur/secrétariat gère tous les fils depuis la page dédiée
 * (boîte de réception) ; les autres rôles ouvrent leur propre fil dans un
 * popover directement depuis cette icône.
 */
export default function MessagingIcon({ schoolId, isStaff }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  async function loadUnreadCount() {
    try {
      const response = await api.get(`/schools/${schoolId}/messages/unread-count`);
      setUnreadCount(response.data.count);
    } catch {
      // Un badge qui rate un poll n'est pas bloquant, pas d'affichage d'erreur.
    }
  }

  useEffect(() => {
    if (!schoolId) return undefined;
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  if (!schoolId) return null;

  function handleClick(e) {
    if (isStaff) {
      // Symétrique avec le popover des autres rôles : un 2e clic referme
      // (revient au tableau de bord) au lieu de ne rien faire une fois
      // déjà sur la page Messages. Lu depuis window.location (pas depuis
      // useLocation()) : le clic doit refléter la route réellement affichée
      // au moment du clic, pas une valeur capturée au dernier rendu.
      const onMessagesPage = window.location.pathname === '/dashboard/messages';
      navigate(onMessagesPage ? '/dashboard' : '/dashboard/messages');
    } else {
      setAnchorEl(e.currentTarget);
    }
  }

  return (
    <>
      <IconButton
        color="inherit"
        aria-label="Messagerie"
        onClick={handleClick}
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={unreadCount} color="primary">
          <ChatBubbleOutlineIcon fontSize="small" />
        </Badge>
      </IconButton>
      {!isStaff && (
        <ChatWidget
          anchorEl={anchorEl}
          onClose={() => setAnchorEl(null)}
          schoolId={schoolId}
          onRead={() => setUnreadCount(0)}
        />
      )}
    </>
  );
}
