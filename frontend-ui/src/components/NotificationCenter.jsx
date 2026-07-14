import { useEffect, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Divider,
  IconButton,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import api from '../api/axios.jsx';

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export default function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function loadNotifications() {
    const response = await api.get('/notifications');
    setNotifications(response.data.notifications);
    setUnreadCount(response.data.unread_count);
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleMarkAllRead() {
    await api.post('/notifications/mark-all-read');
    await loadNotifications();
  }

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small" sx={{ mr: 1 }}>
        <Badge badgeContent={unreadCount} color="primary">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            Notifications
          </Typography>
          <Button
            size="small"
            startIcon={<DoneAllIcon fontSize="small" />}
            disabled={unreadCount === 0}
            onClick={handleMarkAllRead}
          >
            Tout marquer comme lu
          </Button>
        </Box>
        <Divider />
        {notifications.length === 0 && (
          <MenuItem disabled sx={{ opacity: '1 !important' }}>
            <Typography color="text.secondary">Aucune notification.</Typography>
          </MenuItem>
        )}
        {notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => setAnchorEl(null)}
            sx={{
              whiteSpace: 'normal',
              alignItems: 'flex-start',
              bgcolor: n.read_at ? 'transparent' : 'rgba(201, 162, 39, 0.08)',
            }}
          >
            <ListItemText
              primary={n.data.message}
              secondary={timeAgo(n.created_at)}
              slotProps={{
                primary: { variant: 'body2' },
                secondary: { variant: 'caption', color: 'text.secondary' },
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
