import { Fab, Tooltip, Zoom, useTheme } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * A floating action button that navigates to the chatbot page.
 * @param {string} targetPath - The path to navigate to (e.g., '/admin/chatbot')
 */
export default function ChatbotFAB({ targetPath }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

  // Hide the FAB if we are already on the chatbot page
  const isChatbotPage = location.pathname === targetPath;

  if (isChatbotPage) return null;

  return (
    <Zoom in={true} unmountOnExit>
      <Tooltip title="Open Assistant" placement="left" arrow>
        <Fab
          color="primary"
          aria-label="chatbot"
          onClick={() => navigate(targetPath)}
          sx={{
            position: 'fixed',
            bottom: { xs: 16, md: 32 },
            right: { xs: 16, md: 32 },
            boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
            transition: 'transform 0.3s ease-in-out',
            '&:hover': {
              transform: 'scale(1.1) rotate(5deg)',
            },
            zIndex: theme.zIndex.speedDial,
          }}
        >
          <SmartToyIcon />
        </Fab>
      </Tooltip>
    </Zoom>
  );
}
