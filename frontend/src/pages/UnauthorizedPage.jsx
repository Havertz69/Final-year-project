import { Box, Typography, Button } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
      <Typography variant="h4" gutterBottom>Access Denied</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>You do not have permission to access this page.</Typography>
      <Button variant="contained" onClick={() => navigate('/login')}>Go to Login</Button>
    </Box>
  );
}
