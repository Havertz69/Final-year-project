import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton, Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  HomeWork as HomeWorkIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/useAuth';

const BG_IMAGE = "/landing-bg.png";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, token, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || !role) return;
    const resolvedRole = role.toString().toLowerCase();
    navigate(resolvedRole === 'admin' ? '/admin/dashboard' : '/tenant/dashboard', { replace: true });
  }, [token, role, navigate]);

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
      setApiError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      backgroundImage: `url("${BG_IMAGE}")`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        bgcolor: 'rgba(10, 15, 30, 0.75)',
        backdropFilter: 'blur(3px)',
        zIndex: 1
      }
    }}>
      <Card sx={{
        maxWidth: 400,
        width: '100%',
        zIndex: 2,
        borderRadius: 4,
        bgcolor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.6)',
        m: 2
      }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4 }}>
            <Box sx={{
              bgcolor: 'primary.main',
              borderRadius: 2.5,
              p: 1.2,
              mb: 1.5,
              display: 'flex',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
            }}>
              <HomeWorkIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em' }}>
              Property<span style={{ color: '#6366F1' }}>Pulse</span>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              Management Portal
            </Typography>
          </Box>

          {apiError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{apiError}</Alert>}

          <form onSubmit={handleSubmit} noValidate>
            <TextField
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              margin="normal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={!!errors.email}
              helperText={errors.email}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 3 }
              }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              fullWidth
              variant="outlined"
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
                sx: { borderRadius: 3 }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                mt: 4, py: 1.6,
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: '1rem',
                boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
                '&:hover': { transform: 'translateY(-1px)' },
                transition: 'all 0.2s'
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In to Portal'}
            </Button>
          </form>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E2E8F0', textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mb: -0.5 }}>100%</Typography>
                <Typography variant="caption" color="text.secondary">Secure</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', mb: -0.5 }}>Real-time</Typography>
                <Typography variant="caption" color="text.secondary">Alerts</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ position: 'absolute', bottom: 20, zIndex: 2, textAlign: 'center', width: '100%' }}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} PropertyPulse PMS. Authorized Personnel Only.
        </Typography>
      </Box>
    </Box>
  );
}
