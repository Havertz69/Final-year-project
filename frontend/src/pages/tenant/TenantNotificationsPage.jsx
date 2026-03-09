import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText, ListItemIcon,
  IconButton, Chip, Button, Checkbox, Snackbar, Alert, Divider,
} from '@mui/material';
import {
  MarkEmailRead as MarkEmailReadIcon,
  Notifications as NotificationsIcon,
  Payment as PaymentIcon,
  Build as BuildIcon,
  Assignment as AssignmentIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import tenantService from '../../services/tenantService';
import TenantPageShell from '../../components/tenant/TenantPageShell';
import { getApiErrorMessage } from '../../utils/apiUtils';

const typeIcons = {
  PAYMENT_CONFIRMED: <PaymentIcon color="success" />,
  RENT_DUE: <PaymentIcon color="warning" />,
  OVERDUE_RENT: <PaymentIcon color="error" />,
  MAINTENANCE_REQUEST: <BuildIcon color="info" />,
  UNIT_ASSIGNED: <AssignmentIcon color="primary" />,
  SYSTEM_ANNOUNCEMENT: <NotificationsIcon />,
  MESSAGE_RECEIVED: <NotificationsIcon />,
};

export default function TenantNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });

  const fetchNotifications = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await tenantService.getNotifications();
      setNotifications(res.data || []);
    } catch (e) {
      setError(getApiErrorMessage(e, 'Failed to load notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    setSelectedIds(unreadIds.length === selectedIds.length ? [] : unreadIds);
  };

  const handleMarkRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await tenantService.markNotificationsRead({ notification_ids: selectedIds });
      setSnack({ open: true, message: `${selectedIds.length} marked as read`, severity: 'success' });
      setSelectedIds([]);
      fetchNotifications();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to mark read'), severity: 'error' });
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    try {
      await tenantService.markNotificationsRead({ notification_ids: unreadIds });
      setSnack({ open: true, message: 'All notifications marked as read', severity: 'success' });
      fetchNotifications();
    } catch (e) {
      setSnack({ open: true, message: getApiErrorMessage(e, 'Failed to mark all read'), severity: 'error' });
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={fetchNotifications} />;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <TenantPageShell
      title="Notifications"
      subtitle={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`}
      right={
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleMarkAllRead}
              startIcon={<DoneAllIcon />}
              sx={{ borderRadius: 2 }}
            >
              Mark All Read
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            disabled={selectedIds.length === 0}
            onClick={handleMarkRead}
            startIcon={<MarkEmailReadIcon />}
            sx={{ borderRadius: 2 }}
          >
            Mark {selectedIds.length > 0 ? selectedIds.length : ''} Read
          </Button>
        </Box>
      }
    >
      {notifications.length === 0 ? (
        <Paper elevation={0} sx={{ p: 2 }}>
          <EmptyState message="No notifications" />
        </Paper>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 4 }}>
          <List sx={{ p: 0 }}>
            {notifications.map((notif, idx) => (
              <Box key={notif.id}>
                <ListItem
                  sx={{
                    bgcolor: notif.is_read ? 'transparent' : 'action.hover',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    {!notif.is_read && (
                      <Checkbox
                        checked={selectedIds.includes(notif.id)}
                        onChange={() => handleSelect(notif.id)}
                      />
                    )}
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {typeIcons[notif.notification_type] || <NotificationsIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={notif.title}
                    secondaryTypographyProps={{ component: 'div' }}
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {notif.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {notif.time_ago}
                        </Typography>
                      </Box>
                    }
                  />
                  <Chip
                    label={notif.is_read ? 'Read' : 'Unread'}
                    size="small"
                    color={notif.is_read ? 'default' : 'primary'}
                  />
                </ListItem>
                {idx < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        </Paper>
      )}

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack({ ...snack, open: false })}>{snack.message}</Alert>
      </Snackbar>
    </TenantPageShell>
  );
}
