import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Button, Container, Grid, Paper, 
  AppBar, Toolbar, Stack, GlobalStyles 
} from '@mui/material';
import {
  Security as SecurityIcon,
  Update as UpdateIcon,
  SupportAgent as SupportIcon,
  Payment as PaymentIcon,
  HomeWork as HomeWorkIcon
} from '@mui/icons-material';
import useAuth from '../hooks/useAuth';

const HERO_IMAGE = "/landing-hero.png";

export default function LandingPage() {
  const { token, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token && role) {
      const resolved = role.toString().toLowerCase();
      navigate(resolved === 'admin' ? '/admin/dashboard' : '/tenant/dashboard', { replace: true });
    }
  }, [token, role, navigate]);

  const features = [
    {
      title: 'Secure Payments',
      desc: 'Hassle-free automated payment processing with encrypted security.',
      icon: <PaymentIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
    },
    {
      title: 'Maintenance Tracking',
      desc: 'Submit and track maintenance requests in real-time with updates.',
      icon: <UpdateIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
    },
    {
      title: 'Real-time Alerts',
      desc: 'Stay informed with instant notifications for important updates.',
      icon: <SecurityIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
    },
    {
      title: 'Dedicated Support',
      desc: 'Our team is here to help you with any platform-related issues.',
      icon: <SupportIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
    }
  ];

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: '#fff',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #ffffff 50%, #f9faff 100%)',
      position: 'relative',
      overflowX: 'hidden',
      fontFamily: "'WDXL Lubrifont TC', sans-serif"
    }}>
      <GlobalStyles styles={{
        '@keyframes fadeIn': {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      }} />

      {/* Background Animated Blobs */}
      <Box sx={{
        position: 'absolute',
        top: '10%', right: '-10%',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '10%', left: '-10%',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.05) 0%, transparent 70%)',
        filter: 'blur(80px)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <AppBar position="absolute" elevation={0} sx={{ 
        bgcolor: 'rgba(255, 255, 255, 0.65)', 
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
        p: 0.5,
        zIndex: 10
      }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Paper elevation={0} sx={{ 
                bgcolor: '#3b82f6', 
                p: 0.8, 
                borderRadius: '12px', 
                display: 'flex',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                animation: 'float 6s ease-in-out infinite'
              }}>
                <HomeWorkIcon sx={{ color: 'white', fontSize: 24 }} />
              </Paper>
              <Typography variant="h6" sx={{ 
                ml: 1.5, 
                fontWeight: 800, 
                color: '#1e293b', 
                letterSpacing: '-0.03em',
                fontFamily: "'WDXL Lubrifont TC', sans-serif"
              }}>
                PropertyPulse
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              onClick={() => navigate('/login')}
              sx={{ 
                borderRadius: '50px',
                textTransform: 'none',
                px: 4,
                py: 1.2,
                fontWeight: 800,
                bgcolor: '#3b82f6',
                fontFamily: "'WDXL Lubrifont TC', sans-serif",
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                '&:hover': { 
                  bgcolor: '#2563eb', 
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)',
                  transform: 'translateY(-1px)'
                },
                transition: 'all 0.2s'
              }}
            >
              Sign In
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box sx={{ 
        pt: { xs: 14, md: 18 }, 
        pb: { xs: 8, md: 12 },
        position: 'relative',
        zIndex: 1
      }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ 
                pr: { md: 6 },
                animation: 'fadeIn 0.8s ease-out forwards'
              }}>
                <Typography variant="overline" sx={{ 
                  color: '#3b82f6', 
                  fontWeight: 800, 
                  letterSpacing: '0.15em', 
                  mb: 1.5, 
                  display: 'block',
                  fontFamily: "'WDXL Lubrifont TC', sans-serif"
                }}>
                  PREMIUM PROPERTY MANAGEMENT
                </Typography>
                <Typography variant="h1" sx={{ 
                  fontWeight: 800, 
                  color: '#1e293b', 
                  fontSize: { xs: '3rem', md: '4.2rem' },
                  lineHeight: 1,
                  mb: 3,
                  letterSpacing: '-0.04em',
                  fontFamily: "'WDXL Lubrifont TC', sans-serif"
                }}>
                  The Future of <br />
                  <span style={{ 
                    background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Property Living
                  </span>
                </Typography>
                <Typography variant="h6" sx={{ 
                  color: '#64748b', 
                  mb: 5, 
                  fontWeight: 500, 
                  lineHeight: 1.7, 
                  maxWidth: '95%',
                  fontFamily: "'WDXL Lubrifont TC', sans-serif",
                  fontSize: '1.1rem'
                }}>
                  A modern property management portal for landlords and tenants. Manage payments, 
                  maintenance, and communications in one seamless, high-end experience.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5}>
                  <Button 
                    variant="contained" 
                    size="large"
                    onClick={() => navigate('/login')}
                    sx={{ 
                      borderRadius: '50px', 
                      py: 2, px: 6,
                      fontWeight: 800,
                      textTransform: 'none',
                      bgcolor: '#3b82f6',
                      fontFamily: "'WDXL Lubrifont TC', sans-serif",
                      boxShadow: '0 12px 30px rgba(59, 130, 246, 0.3)',
                      '&:hover': { 
                        bgcolor: '#2563eb',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 18px 40px rgba(59, 130, 246, 0.4)'
                      },
                      transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                  >
                    Get Started Now
                  </Button>
                  <Button 
                    variant="outlined" 
                    size="large"
                    sx={{ 
                      borderRadius: '50px', 
                      py: 2, px: 6,
                      fontWeight: 800,
                      textTransform: 'none',
                      borderColor: '#e2e8f0',
                      color: '#64748b',
                      fontFamily: "'WDXL Lubrifont TC', sans-serif",
                      '&:hover': { 
                        borderColor: '#3b82f6', 
                        color: '#3b82f6', 
                        bgcolor: 'rgba(59, 130, 246, 0.05)',
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.3s'
                    }}
                  >
                    Learn More
                  </Button>
                </Stack>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ display: { xs: 'none', md: 'block' } }}>
              <Box sx={{ 
                position: 'relative',
                animation: 'fadeIn 1s ease-out forwards',
                animationDelay: '0.2s',
                opacity: 0
              }}>
                <Paper elevation={0} sx={{ 
                  borderRadius: '40px', 
                  overflow: 'hidden',
                  boxShadow: '0 40px 100px rgba(30, 41, 59, 0.18)',
                  position: 'relative',
                  zIndex: 2,
                  border: '1px solid rgba(255, 255, 255, 0.8)',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }
                }}>
                  <Box 
                    component="img" 
                    src={HERO_IMAGE} 
                    sx={{ width: '100%', height: 'auto', display: 'block' }} 
                  />
                </Paper>
                {/* Decorative Elements */}
                <Box sx={{
                  position: 'absolute',
                  top: -20, right: -20,
                  width: 100, height: 100,
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  borderRadius: '24px',
                  zIndex: 1,
                  opacity: 0.1,
                  transform: 'rotate(12deg)'
                }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ pb: 10 }}>
        <Box sx={{ 
          textAlign: 'center', 
          mb: 8,
          animation: 'fadeIn 1.2s ease-out forwards',
          animationDelay: '0.4s',
          opacity: 0
        }}>
          <Typography variant="h4" sx={{ 
            fontWeight: 800, 
            color: '#1e293b', 
            mb: 2, 
            letterSpacing: '-0.03em',
            fontFamily: "'WDXL Lubrifont TC', sans-serif"
          }}>
            Smarter Management, <span style={{ color: '#3b82f6' }}>Simpler Life</span>
          </Typography>
          <Typography variant="body1" sx={{ 
            color: '#64748b', 
            maxWidth: 600, 
            mx: 'auto', 
            fontWeight: 500, 
            lineHeight: 1.8,
            fontFamily: "'WDXL Lubrifont TC', sans-serif",
            fontSize: '1.05rem'
          }}>
            Everything you need to manage your rental experience efficiently and securely.
          </Typography>
        </Box>
        <Grid container spacing={3.5}>
          {features.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper elevation={0} sx={{ 
                p: 4, 
                borderRadius: '30px', 
                height: '100%',
                bgcolor: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(241, 245, 249, 0.8)',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'fadeIn 0.8s ease-out forwards',
                animationDelay: `${0.6 + i * 0.1}s`,
                opacity: 0,
                '&:hover': {
                  transform: 'translateY(-12px) rotateX(4deg)',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.08)',
                  bgcolor: '#ffffff',
                  borderColor: '#3b82f6',
                  '& .icon-box': {
                    bgcolor: '#3b82f6',
                    color: '#fff',
                    transform: 'scale(1.1) rotate(6deg)'
                  }
                }
              }}>
                <Box className="icon-box" sx={{ 
                  mb: 3, 
                  bgcolor: 'rgba(59, 130, 246, 0.08)', 
                  width: 'fit-content', 
                  p: 2, 
                  borderRadius: '18px',
                  display: 'flex',
                  color: '#3b82f6',
                  transition: 'all 0.3s'
                }}>
                  {f.icon}
                </Box>
                <Typography variant="h6" sx={{ 
                  fontWeight: 800, 
                  color: '#1e293b', 
                  mb: 1.5, 
                  fontSize: '1.15rem',
                  letterSpacing: '-0.02em',
                  fontFamily: "'WDXL Lubrifont TC', sans-serif"
                }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#64748b', 
                  lineHeight: 1.7, 
                  fontWeight: 500,
                  fontFamily: "'WDXL Lubrifont TC', sans-serif"
                }}>
                  {f.desc}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ 
        py: 6, 
        borderTop: '1px solid rgba(241, 245, 249, 0.8)', 
        textAlign: 'center',
        background: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(10px)'
      }}>
        <Container maxWidth="lg">
          <Typography variant="caption" sx={{ 
            color: '#94a3b8', 
            fontWeight: 700, 
            letterSpacing: '0.05em',
            fontFamily: "'WDXL Lubrifont TC', sans-serif"
          }}>
            © {new Date().getFullYear()} PROPERTYPULSE PMS. ALL RIGHTS RESERVED.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
