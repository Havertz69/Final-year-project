import { Box, Typography, Button } from '@mui/material';
import InboxIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({ message = 'No data found', actionLabel, onAction }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 10, color: 'text.secondary' }}>
      <InboxIcon sx={{ fontSize: 64, mb: 2, opacity: 0.4 }} />
      <Typography variant="h6" gutterBottom>{message}</Typography>
      {actionLabel && onAction && (
        <Button variant="outlined" onClick={onAction} sx={{ mt: 1 }}>{actionLabel}</Button>
      )}
    </Box>
  );
}
