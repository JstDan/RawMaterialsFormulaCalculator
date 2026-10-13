import { Route, Routes, useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { AppLayout } from './components/AppLayout';
import { t } from './i18n';

export function App() {
  const navigate = useNavigate();
  return (
    <AppLayout onNewOffer={() => navigate('/')}>
      <Routes>
        <Route path="/" element={<Typography variant="h1">{t.nav.calculator}</Typography>} />
        <Route path="/offers" element={<Typography variant="h1">{t.offers.title}</Typography>} />
        <Route path="/materials" element={<Typography variant="h1">{t.materials.title}</Typography>} />
        <Route path="*" element={<Typography>{t.common.notFound}</Typography>} />
      </Routes>
    </AppLayout>
  );
}
