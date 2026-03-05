import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, Avatar, useMediaQuery, useTheme, Tooltip, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PaymentsIcon from '@mui/icons-material/Payment';
import BuildIcon from '@mui/icons-material/Build';
import DescriptionIcon from '@mui/icons-material/Description';
import NotificationsIcon from '@mui/icons-material/Notifications';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useAuth from '../../hooks/useAuth';
import PageTransition from '../common/PageTransition';

const FULL_WIDTH = 240;
const RAIL_WIDTH = 64;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/tenant/dashboard' },
  { label: 'Profile', icon: <PersonOutlineIcon />, path: '/tenant/profile' },
  { label: 'Lease', icon: <DescriptionIcon />, path: '/tenant/lease' },
  { label: 'Payments', icon: <PaymentsIcon />, path: '/tenant/payments' },
  { label: 'Maintenance', icon: <BuildIcon />, path: '/tenant/maintenance' },
  { label: 'Notifications', icon: <NotificationsIcon />, path: '/tenant/notifications' },
  { label: 'Chatbot', icon: <ChatIcon />, path: '/tenant/chatbot' },
];

export default function TenantLayout() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const drawerWidth = collapsed && !isMobile ? RAIL_WIDTH : FULL_WIDTH;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          px: collapsed && !isMobile ? 1 : 2,
          py: 1,
        }}
      >
        {(!collapsed || isMobile) && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
            Property Pulse
          </Typography>
        )}
        {!isMobile && (
          <IconButton onClick={() => setCollapsed(!collapsed)} size="small">
            <ChevronLeftIcon sx={{ transform: collapsed ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      <List sx={{ flex: 1 }}>
        {navItems.map((item) => (
          <Tooltip key={item.path} title={collapsed && !isMobile ? item.label : ''} placement="right">
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => { navigate(item.path); if (isMobile) setMobileOpen(false); }}
              sx={{
                mx: collapsed && !isMobile ? 1 : 1.5,
                my: 0.5,
                px: collapsed && !isMobile ? 2 : 2,
                borderRadius: 2,
                justifyContent: collapsed && !isMobile ? 'center' : 'flex-start',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { bgcolor: 'primary.dark' },
                },
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemIcon sx={{ minWidth: collapsed && !isMobile ? 0 : 40, justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              {(!collapsed || isMobile) && <ListItemText primary={item.label} />}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: 'background.default',
        backgroundImage:
          'radial-gradient(900px 400px at 10% 0%, rgba(37, 99, 235, 0.10) 0%, rgba(255,255,255,0) 60%), radial-gradient(900px 400px at 90% 0%, rgba(13, 115, 119, 0.10) 0%, rgba(255,255,255,0) 55%)',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: FULL_WIDTH } }}>
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              transition: 'width 0.2s',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 600, color: 'text.primary' }}>
              Tenant Portal
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
                {user?.email?.[0]?.toUpperCase() || 'T'}
              </Avatar>
              <Tooltip title="Logout">
                <IconButton onClick={logout} size="small"><LogoutIcon /></IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
          <Box sx={{ maxWidth: 1280, mx: 'auto', width: '100%' }}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
