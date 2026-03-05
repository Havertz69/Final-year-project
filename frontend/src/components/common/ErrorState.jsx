import { Box, Alert, Button } from '@mui/material';

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
      <Alert severity="error" sx={{ mb: 2, maxWidth: 480, width: '100%' }}>{message}</Alert>
      {onRetry && <Button variant="outlined" color="error" onClick={onRetry}>Retry</Button>}
    </Box>
  );
}
