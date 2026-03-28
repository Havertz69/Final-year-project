import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, Typography, TextField, Button,
  Alert, CircularProgress, InputAdornment, IconButton, Grid, Paper,
  Backdrop
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  HomeWork as HomeWorkIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorOutlineIcon
} from '@mui/icons-material';
import useAuth from '../../hooks/useAuth';

const HERO_IMAGE = "/login-hero.png";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingIdentity, setCheckingIdentity] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginError, setLoginError] = useState(false);
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
    setCheckingIdentity(true);
    setLoginSuccess(false);
    setLoginError(false);
    setApiError('');
    
    // 1. Initial Identity Check (1.2 seconds to leave room for the final state)
    const checkStartTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    try {
      // 2. Attempt Login
      const r = await login(email, password);
      
      // 3. Success State (Total duration exactly 2 seconds)
      setLoginSuccess(true);
      const elapsed = Date.now() - checkStartTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
    } catch (err) {
      // 3. Error State (Total duration exactly 2 seconds)
      setLoginError(true);
      const elapsed = Date.now() - checkStartTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      await new Promise(resolve => setTimeout(resolve, remainingTime));
      
      setApiError(err.errorMessage || 'Login failed. Please check your credentials.');
      setCheckingIdentity(false);
      setLoginError(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%)',
      p: 2
    }}>
      <Card sx={{
        maxWidth: 1100,
        width: '100%',
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        borderRadius: '24px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.08)',
        overflow: 'hidden',
        minHeight: { md: 650 }
      }}>
        {/* Left Side: Hero Image */}
        <Grid item xs={12} md={6} sx={{ 
          display: { xs: 'none', md: 'block' },
          position: 'relative',
          overflow: 'hidden'
        }}>
          <Box
            component="img"
            src={HERO_IMAGE}
            alt="Modern Interior"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.5s ease',
              '&:hover': {
                transform: 'scale(1.02)'
              }
            }}
          />
          <Box sx={{
            position: 'absolute',
            bottom: 40,
            left: 40,
            color: 'white',
            zIndex: 2,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, letterSpacing: '-0.02em' }}>
              Elevate Your <br /> Living Experience
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
              Premium Rental Management System
            </Typography>
          </Box>
          <Box sx={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 100%)',
            pointerEvents: 'none'
          }} />
        </Grid>

        {/* Right Side: Login Form */}
        <Box sx={{ 
          flex: 1, 
          p: { xs: 4, md: 6, lg: 8 }, 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Paper elevation={0} sx={{ 
                bgcolor: '#3b82f6', 
                p: 0.8, 
                borderRadius: '10px', 
                display: 'flex',
                boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)'
              }}>
                <HomeWorkIcon sx={{ color: 'white', fontSize: 24 }} />
              </Paper>
              <Typography variant="h6" sx={{ ml: 1.5, fontWeight: 700, color: '#1e293b', fontSize: '1.1rem' }}>
                PropertyPulse
              </Typography>
            </Box>
            <Typography variant="h4" sx={{ 
              fontWeight: 800, 
              color: '#1e293b', 
              mb: 1,
              letterSpacing: '-0.02em',
              fontSize: { xs: '1.75rem', md: '2.25rem' }
            }}>
              Rental House Management System
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
              Welcome back! Please login to your account.
            </Typography>
          </Box>

          {apiError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '12px', fontWeight: 500 }}>
              {apiError}
            </Alert>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                label="Email address"
                type="email"
                fullWidth
                variant="outlined"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: '50px',
                    bgcolor: '#f8fafc',
                    '& fieldset': { border: '1px solid #e2e8f0' },
                    '&:hover fieldset': { borderColor: '#3b82f6 !important' },
                  }
                }}
              />
              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                helperText={errors.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                        {showPassword ? <VisibilityOff sx={{ fontSize: 20 }} /> : <Visibility sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { 
                    borderRadius: '50px',
                    bgcolor: '#f8fafc',
                    '& fieldset': { border: '1px solid #e2e8f0' },
                    '&:hover fieldset': { borderColor: '#3b82f6 !important' },
                  }
                }}
              />
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1 }}>
                <Button
                  variant="text"
                  onClick={() => window.location.href = 'mailto:admin@propertypulse.com?subject=Password%20Reset%20Request'}
                  sx={{
                    color: '#3b82f6',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                  }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading}
                sx={{
                  mt: 1,
                  py: 1.8,
                  borderRadius: '50px',
                  bgcolor: '#3b82f6',
                  boxShadow: '0 10px 20px rgba(59, 130, 246, 0.2)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#2563eb',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 12px 24px rgba(59, 130, 246, 0.3)',
                  },
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Login to Account'}
              </Button>
            </Box>
          </form>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
              Don't have an account?{' '}
              <Button
                variant="text"
                onClick={() => window.location.href = 'mailto:admin@propertypulse.com?subject=New%20Account%20Request'}
                sx={{
                  color: '#3b82f6',
                  fontWeight: 700,
                  textTransform: 'none',
                  minWidth: 0,
                  p: 0,
                  ml: 0.5,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' }
                }}
              >
                Contact management
              </Button>
            </Typography>
          </Box>

          <Box sx={{ mt: 8, pt: 2, borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 500 }}>
              © {new Date().getFullYear()} PropertyPulse PMS. All rights reserved.
            </Typography>
          </Box>
        </Box>
      </Card>

      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          flexDirection: 'column',
          backdropFilter: 'blur(10px)',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          transition: 'all 0.5s ease'
        }}
        open={checkingIdentity}
      >
        {!loginSuccess && !loginError ? (
          <>
            <CircularProgress color="inherit" size={60} thickness={4} sx={{ mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '0.05em' }}>
              Checking identity...
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              Please wait while we verify your credentials.
            </Typography>
          </>
        ) : loginSuccess ? (
          <>
            <Box sx={{ 
              bgcolor: 'rgba(34, 197, 94, 0.2)', 
              p: 2, 
              borderRadius: '50%',
              display: 'flex',
              mb: 2,
              animation: 'scaleIn 0.3s ease-out'
            }}>
              <CheckCircleIcon sx={{ color: '#22c55e', fontSize: 60 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
              Login Successful!
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Redirecting to your dashboard...
            </Typography>
          </>
        ) : (
          <>
            <Box sx={{ 
              bgcolor: 'rgba(239, 68, 68, 0.2)', 
              p: 2, 
              borderRadius: '50%',
              display: 'flex',
              mb: 2,
              animation: 'scaleIn 0.3s ease-out'
            }}>
              <ErrorOutlineIcon sx={{ color: '#ef4444', fontSize: 60 }} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1 }}>
              Access Denied
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Invalid credentials provided.
            </Typography>
          </>
        )}
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}} />
      </Backdrop>
    </Box>
  );
}
