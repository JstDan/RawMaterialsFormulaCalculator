import { createTheme } from '@mui/material/styles';

export const ACCENT = '#1b7a4b';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: ACCENT },
    background: { default: '#f6f8f7', paper: '#ffffff' },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '"Roboto", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.6rem', fontWeight: 600 },
    h2: { fontSize: '1.2rem', fontWeight: 600 },
    h3: { fontSize: '1rem', fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Never allow horizontal scrolling anywhere.
        'html, body, #root': { overflowX: 'hidden', maxWidth: '100%' },
        'input[inputmode="decimal"], input[inputmode="numeric"]': { textAlign: 'right' },
      },
    },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
});
