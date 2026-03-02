import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import useAuth from '../../hooks/useAuth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token, role } = useAuth();
  const navigate = useNavigate();

  if (token && role) {
    navigate(role === 'admin' ? '/admin/dashboard' : '/tenant/dashboard', { replace: true });
  }

  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Invalid email';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setApiError('');
    try {
      const r = await login(email, password);
      navigate(r === 'admin' ? '/admin/dashboard' : '/tenant/dashboard', { replace: true });
    } catch (err) {
      setApiError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ color: 'primary.main', fontWeight: 700 }}>
            Ploti
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 3 }}>
            Property Management System
          </Typography>
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
          <form onSubmit={handleSubmit} noValidate>
            <TextField label="Email" type="email" fullWidth margin="normal"
              value={email} onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email} helperText={errors.email} />
            <TextField label="Password" type="password" fullWidth margin="normal"
              value={password} onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password} helperText={errors.password} />
            <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={loading}>
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
