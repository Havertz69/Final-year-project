import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, IconButton, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Box, Avatar, useMediaQuery, useTheme, Tooltip, Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PeopleIcon from '@mui/icons-material/People';
import PaymentsIcon from '@mui/icons-material/Payment';
import BarChartIcon from '@mui/icons-material/BarChart';
import BuildIcon from '@mui/icons-material/Build';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import useAuth from '../../hooks/useAuth';

const FULL_WIDTH = 240;
const RAIL_WIDTH = 64;

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
  { label: 'Units', icon: <ApartmentIcon />, path: '/admin/units' },
  { label: 'Tenants', icon: <PeopleIcon />, path: '/admin/tenants' },
  { label: 'Payments', icon: <PaymentsIcon />, path: '/admin/payments' },
  { label: 'Reports', icon: <BarChartIcon />, path: '/admin/reports' },
  { label: 'Maintenance', icon: <BuildIcon />, path: '/admin/maintenance' },
  { label: 'Chatbot', icon: <ChatIcon />, path: '/admin/chatbot' },
];

export default function AdminLayout() {
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
      <Toolbar sx={{ justifyContent: collapsed && !isMobile ? 'center' : 'space-between' }}>
        {(!collapsed || isMobile) && (
          <Typography variant="h6" noWrap sx={{ fontWeight: 700, color: 'primary.main' }}>
            Ploti
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
              sx={{ px: collapsed && !isMobile ? 2.5 : 2, justifyContent: collapsed && !isMobile ? 'center' : 'flex-start' }}
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }} sx={{ '& .MuiDrawer-paper': { width: FULL_WIDTH } }}>
          {drawerContent}
        </Drawer>
      ) : (
        <Drawer variant="permanent"
          sx={{ width: drawerWidth, flexShrink: 0, '& .MuiDrawer-paper': { width: drawerWidth, transition: 'width 0.2s' } }}>
          {drawerContent}
        </Drawer>
      )}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" color="inherit" elevation={0}
          sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" sx={{ flex: 1, fontWeight: 600, color: 'text.primary' }}>
              Admin Panel
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </Avatar>
              <Tooltip title="Logout">
                <IconButton onClick={logout} size="small"><LogoutIcon /></IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: { xs: 2, md: 3 }, flex: 1 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
