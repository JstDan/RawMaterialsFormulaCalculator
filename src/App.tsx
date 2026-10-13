import type { ReactNode } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { Alert, Box, Chip, CircularProgress, Tooltip, Typography } from '@mui/material';
import { AppLayout } from './components/AppLayout';
import { AuthProvider, useAuth } from './data/AuthContext';
import { DataProvider, useData } from './data/DataContext';
import { CalculatorPage } from './pages/CalculatorPage';
import { LoginPage } from './pages/LoginPage';
import { RawMaterialsPage } from './pages/RawMaterialsPage';
import { SavedOffersPage } from './pages/SavedOffersPage';
import { OfferFormProvider, useOfferForm } from './state/OfferFormContext';
import { t } from './i18n';

function Loading() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
      <CircularProgress aria-label={t.common.loading} />
    </Box>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<CalculatorPage />} />
      <Route path="/offers" element={<SavedOffersPage />} />
      <Route path="/materials" element={<RawMaterialsPage />} />
      <Route path="*" element={<Typography>{t.common.notFound}</Typography>} />
    </Routes>
  );
}

function Shell({ badge, onLogout }: { badge: ReactNode; onLogout?: () => void }) {
  const { newOffer } = useOfferForm();
  const navigate = useNavigate();
  const startNewOffer = () => {
    void newOffer();
    navigate('/');
    window.scrollTo({ top: 0 });
  };
  return (
    <AppLayout onNewOffer={startNewOffer} onLogout={onLogout} badge={badge}>
      <AppRoutes />
    </AppLayout>
  );
}

function DataGate({ badge, onLogout }: { badge: ReactNode; onLogout?: () => void }) {
  const { loading, error } = useData();
  if (loading || error) {
    return (
      <AppLayout onNewOffer={() => undefined} onLogout={onLogout} badge={badge}>
        {error ? <Alert severity="error">{`${t.common.error}: ${error}`}</Alert> : <Loading />}
      </AppLayout>
    );
  }
  return (
    <OfferFormProvider>
      <Shell badge={badge} onLogout={onLogout} />
    </OfferFormProvider>
  );
}

function AuthGate() {
  const { ready, session, demo, signOut } = useAuth();

  if (!ready) return <Loading />;
  if (!demo && !session) return <LoginPage />;

  const badge = demo ? (
    <Tooltip title={t.nav.demoModeHint}>
      <Chip
        size="small"
        color="warning"
        variant="outlined"
        label={t.nav.demoMode}
        sx={{ display: { xs: 'none', sm: 'flex' } }}
      />
    </Tooltip>
  ) : null;

  return (
    <DataProvider>
      <DataGate badge={badge} onLogout={demo ? undefined : () => void signOut()} />
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
