import { useState, type FormEvent } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../data/AuthContext';
import { t } from '../i18n';

// Internal staff only: accounts are created in the Supabase dashboard, there is no public sign-up.
export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      await signIn(email.trim(), password);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 400 }}>
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <Box>
              <Typography variant="h3" color="primary" sx={{ fontWeight: 700 }}>
                {t.appName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t.auth.subtitle}
              </Typography>
            </Box>
            <Typography variant="h2">{t.auth.title}</Typography>
            {error && <Alert severity="error">{t.auth.failed}</Alert>}
            <TextField
              label={t.auth.email}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <TextField
              label={t.auth.password}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="contained" size="large" disabled={busy}>
              {t.auth.signIn}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
