import { Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './data/AuthContext';
import { DataProvider, useData } from './data/DataContext';
import { LoginPage } from './pages/LoginPage';
import { t } from './i18n';

function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <CircularProgress aria-label={t.common.loading} />
    </Box>
  );
}

function AppRoutes() {
  const { loading, error } = useData();
  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{`${t.common.error}: ${error}`}</Alert>;
  return (
    <Routes>
      <Route path="/" element={<Typography variant="h1">{t.nav.calculator}</Typography>} />
      <Route path="/offers" element={<Typography variant="h1">{t.offers.title}</Typography>} />
      <Route path="/materials" element={<Typography variant="h1">{t.materials.title}</Typography>} />
      <Route path="*" element={<Typography>{t.common.notFound}</Typography>} />
    </Routes>
  );
}

function AuthGate() {
  const { ready, session, demo, signOut } = useAuth();
  const navigate = useNavigate();

  if (!ready) return <Loading />;
  if (!demo && !session) return <LoginPage />;

  const badge = demo ? (
    <Tooltip title={t.nav.demoModeHint}>
      <Chip size="small" color="warning" variant="outlined" label={t.nav.demoMode} sx={{ display: { xs: 'none', sm: 'flex' } }} />
    </Tooltip>
  ) : null;

  return (
    <DataProvider>
      <AppLayout onNewOffer={() => navigate('/')} onLogout={demo ? undefined : () => void signOut()} badge={badge}>
        <AppRoutes />
      </AppLayout>
    </DataProvider>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
