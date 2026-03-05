import { Box, Typography } from '@mui/material';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorState from '../common/ErrorState';

export default function AdminPageShell({ title, subtitle, children, right, loading, error, onRetry }) {
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {right && <Box>{right}</Box>}
      </Box>
      {children}
    </Box>
  );
}
