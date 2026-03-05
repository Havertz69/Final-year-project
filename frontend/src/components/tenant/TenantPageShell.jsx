import { Box, Paper, Typography } from '@mui/material';

const T = {
  bg: '#F7F8FA',
  navy: '#1A2340',
  mutedOnDark: 'rgba(255,255,255,0.45)',
};

export default function TenantPageShell({ title, subtitle, right, children }) {
  return (
    <Box sx={{ background: T.bg, borderRadius: 3, p: { xs: 2, sm: 3, md: 4 } }}>
      <Paper
        elevation={0}
        sx={{
          mb: 3.5,
          p: { xs: '20px 24px', md: '24px 32px' },
          borderRadius: '16px',
          background: T.navy,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.55rem' }, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', mb: 0.3 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ color: T.mutedOnDark, fontSize: '0.85rem' }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {right ? right : null}
      </Paper>
      {children}
    </Box>
  );
}
