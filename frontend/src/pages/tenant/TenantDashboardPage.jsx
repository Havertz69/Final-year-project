import { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Box, Grid,
  Skeleton, Divider, Paper, Avatar,
} from '@mui/material';
import HomeWorkOutlinedIcon from '@mui/icons-material/HomeWorkOutlined';
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import tenantService from '../../services/tenantService';

/* ── design tokens ──────────────────────────────────────────────── */
const T = {
  bg: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E8ECF2',
  navy: '#1A2340',
  slate: '#3D4966',
  muted: '#8C95A8',
  blue: '#2563EB',
  blueLight: '#EEF4FF',
  green: '#16A34A',
  greenLight: '#F0FDF4',
  red: '#DC2626',
  redLight: '#FEF2F2',
  amber: '#D97706',
  amberLight: '#FFFBEB',
};

const ANIM = {
  rise: {
    '@keyframes rise': {
      from: { opacity: 0, transform: 'translateY(12px)' },
      to: { opacity: 1, transform: 'translateY(0)' },
    },
  },
};

const STATUS_CFG = {
  PAID: { label: 'Paid', color: T.green, bg: T.greenLight, icon: <CheckCircleOutlineIcon sx={{ fontSize: 15 }} /> },
  OVERDUE: { label: 'Overdue', color: T.red, bg: T.redLight, icon: <ErrorOutlineIcon sx={{ fontSize: 15 }} /> },
  PENDING: { label: 'Pending', color: T.amber, bg: T.amberLight, icon: <AccessTimeIcon sx={{ fontSize: 15 }} /> },
};

/* ── StatusPill ─────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const cfg = STATUS_CFG[status];
  if (!cfg) return <Typography sx={{ color: T.muted, fontSize: '0.85rem' }}>—</Typography>;
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.6,
      px: 1.5, py: 0.5, borderRadius: '20px',
      background: cfg.bg, color: cfg.color,
      fontSize: '0.8rem', fontWeight: 700,
      border: `1px solid ${cfg.color}30`,
    }}>
      {cfg.icon} {cfg.label}
    </Box>
  );
}

/* ── StatCard ────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, loading, iconBg, iconColor, delay = 0 }) {
  return (
    <Card elevation={0} sx={{
      borderRadius: '14px', border: `1px solid ${T.border}`,
      background: T.surface, height: '100%',
      opacity: 0, animation: `rise 0.42s ease forwards`, animationDelay: `${delay}ms`,
      transition: 'box-shadow 0.2s, transform 0.2s',
      '&:hover': { boxShadow: '0 6px 24px rgba(26,35,64,0.08)', transform: 'translateY(-2px)' },
      ...ANIM.rise,
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.5 }}>
              {label}
            </Typography>
            {loading
              ? <Skeleton width={110} height={34} sx={{ borderRadius: '8px' }} />
              : <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: T.navy, lineHeight: 1, fontFamily: '"Figtree", "Helvetica Neue", sans-serif' }}>
                {value || '—'}
              </Typography>
            }
          </Box>
          <Avatar sx={{ width: 44, height: 44, borderRadius: '12px', background: iconBg, color: iconColor }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

/* ── Section ─────────────────────────────────────────────────────── */
function Section({ title, icon, children, delay = 0 }) {
  return (
    <Card elevation={0} sx={{
      borderRadius: '14px', border: `1px solid ${T.border}`,
      background: T.surface, height: '100%',
      opacity: 0, animation: `rise 0.42s ease forwards`, animationDelay: `${delay}ms`,
      ...ANIM.rise,
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 2 }}>
          <Box sx={{ color: T.muted, display: 'flex' }}>{icon}</Box>
          <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: T.navy }}>
            {title}
          </Typography>
        </Box>
        <Divider sx={{ borderColor: T.border, mb: 2.5 }} />
        {children}
      </CardContent>
    </Card>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */
export default function TenantDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await tenantService.getDashboard();
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) return <ErrorState message={error} onRetry={fetchData} />;
  if (!loading && !data) return <EmptyState message="No dashboard data" />;

  const unitInfo = data?.unit_info;
  const paymentSummary = data?.payment_summary;
  const notifications = data?.recent_notifications || [];
  const currentStatus = paymentSummary?.current_month?.status;
  const overdueCount = paymentSummary?.overdue_count ?? 0;

  const statCards = [
    {
      label: 'Unit Number', value: unitInfo?.unit_number,
      icon: <HomeWorkOutlinedIcon sx={{ fontSize: 20 }} />,
      iconBg: T.blueLight, iconColor: T.blue, delay: 80,
    },
    {
      label: 'Property', value: unitInfo?.property_name,
      icon: <ApartmentOutlinedIcon sx={{ fontSize: 20 }} />,
      iconBg: '#F3F0FF', iconColor: '#7C3AED', delay: 140,
    },
    {
      label: 'Monthly Rent',
      value: unitInfo?.rent_amount != null ? `KES ${Number(unitInfo.rent_amount).toLocaleString()}` : undefined,
      icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 20 }} />,
      iconBg: '#FFF7ED', iconColor: '#EA580C', delay: 200,
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, background: T.bg, minHeight: '100vh', fontFamily: '"Figtree", "Helvetica Neue", sans-serif' }}>

      {/* Header */}
      <Paper elevation={0} sx={{
        mb: 3.5, p: { xs: '20px 24px', md: '24px 32px' },
        borderRadius: '16px', background: T.navy,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 2,
        opacity: 0, animation: 'rise 0.38s ease forwards',
        ...ANIM.rise,
      }}>
        <Box>
          <Typography sx={{ fontSize: { xs: '1.3rem', md: '1.55rem' }, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', mb: 0.3 }}>
            Tenant Dashboard
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>
            Overview of your unit, payments, and activity
          </Typography>
        </Box>

        {/* status badge in header */}
        <Box sx={{ px: 2, py: 1, borderRadius: '10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 100, textAlign: 'center' }}>
          {loading
            ? <Skeleton width={80} height={26} sx={{ borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.12)' }} />
            : currentStatus
              ? <StatusPill status={currentStatus} />
              : <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>No status</Typography>
          }
        </Box>
      </Paper>

      <Grid container spacing={2.5}>

        {/* Stat cards */}
        {statCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.label}>
            <StatCard loading={loading} {...card} />
          </Grid>
        ))}

        {/* Payment Summary */}
        <Grid item xs={12} md={5}>
          <Section title="Payment Summary" icon={<TrendingUpIcon sx={{ fontSize: 18 }} />} delay={280}>
            <Grid container spacing={1.5}>

              <Grid item xs={6}>
                <Box sx={{ p: 2, borderRadius: '10px', background: T.greenLight, border: `1px solid ${T.green}25` }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.green, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
                    Total Paid
                  </Typography>
                  {loading
                    ? <Skeleton width={90} height={28} sx={{ borderRadius: '6px' }} />
                    : <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: T.green }}>
                      KES {Number(paymentSummary?.total_paid ?? 0).toLocaleString()}
                    </Typography>
                  }
                </Box>
              </Grid>

              <Grid item xs={6}>
                <Box sx={{
                  p: 2, borderRadius: '10px',
                  background: overdueCount > 0 ? T.redLight : T.bg,
                  border: `1px solid ${overdueCount > 0 ? `${T.red}25` : T.border}`,
                }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
                    Overdue
                  </Typography>
                  {loading
                    ? <Skeleton width={60} height={28} sx={{ borderRadius: '6px' }} />
                    : <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: overdueCount > 0 ? T.red : T.navy }}>
                      KES {Number(paymentSummary?.outstanding_balance ?? 0).toLocaleString()}
                    </Typography>
                  }
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ p: 2, borderRadius: '10px', background: T.bg, border: `1px solid ${T.border}` }}>
                  <Typography sx={{ fontSize: '0.68rem', fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.07em', mb: 0.75 }}>
                    This Month
                  </Typography>
                  {loading
                    ? <Skeleton width={80} height={26} sx={{ borderRadius: '8px' }} />
                    : <StatusPill status={currentStatus} />
                  }
                </Box>
              </Grid>

            </Grid>
          </Section>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={7}>
          <Section title="Recent Notifications" icon={<NotificationsNoneOutlinedIcon sx={{ fontSize: 18 }} />} delay={340}>
            {loading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={62} sx={{ borderRadius: '10px' }} />)}
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '50%', background: T.bg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <NotificationsNoneOutlinedIcon sx={{ color: T.muted, fontSize: 22 }} />
                </Box>
                <Typography sx={{ color: T.muted, fontSize: '0.875rem', fontWeight: 500 }}>
                  You're all caught up
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {notifications.slice(0, 5).map((n, idx) => (
                  <Box key={n.id} sx={{
                    display: 'flex', alignItems: 'flex-start', gap: 1.5,
                    p: '12px 14px', borderRadius: '10px',
                    border: `1px solid ${T.border}`, background: T.surface,
                    cursor: 'default',
                    transition: 'border-color 0.18s, background 0.18s',
                    opacity: 0, animation: `rise 0.35s ease forwards`,
                    animationDelay: `${380 + idx * 55}ms`,
                    ...ANIM.rise,
                    '&:hover': { borderColor: `${T.blue}44`, background: T.blueLight },
                  }}>
                    <Box sx={{ width: 7, height: 7, borderRadius: '50%', background: T.blue, flexShrink: 0, mt: '6px' }} />
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: T.navy, mb: 0.25 }}>
                        {n.title}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: T.muted, lineHeight: 1.55 }}>
                        {n.message}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Section>
        </Grid>

      </Grid>
    </Box>
  );
}