import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

export default function PageTransition({ children }) {
  const location = useLocation();
  const key = useMemo(() => location.pathname, [location.pathname]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 20);
    return () => clearTimeout(t);
  }, [key]);

  return (
    <Box
      key={key}
      sx={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0px)' : 'translateY(6px)',
        transition: 'opacity 220ms ease, transform 220ms ease',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Box>
  );
}
