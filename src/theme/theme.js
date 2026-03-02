import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0D7377',
      light: '#14A3A8',
      dark: '#095254',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#323645',
      light: '#4A4E5E',
      dark: '#1E2130',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F4F6F9',
      paper: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
    },
    warning: {
      main: '#ED6C02',
    },
    error: {
      main: '#D32F2F',
    },
    text: {
      primary: '#1A1D2B',
      secondary: '#5F6577',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

export default theme;
