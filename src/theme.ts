import { createContext, useContext } from 'react';
import { createTheme, type PaletteMode } from '@mui/material/styles';

export const ACCENT = '#1b7a4b';
// Lighter green for the dark theme so text/buttons keep enough contrast on dark surfaces.
const ACCENT_DARK_MODE = '#4cb782';

export const COLOR_MODE_KEY = 'nutrikal.colorMode';
// Dark mode is the default; users can switch to the light theme from the header.
export const DEFAULT_COLOR_MODE: PaletteMode = 'dark';

export const ColorModeContext = createContext<{ mode: PaletteMode; toggle: () => void }>({
  mode: DEFAULT_COLOR_MODE,
  toggle: () => undefined,
});

export const useColorMode = () => useContext(ColorModeContext);

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? ACCENT_DARK_MODE : ACCENT },
      background: dark ? { default: '#0f1412', paper: '#171d1a' } : { default: '#f6f8f7', paper: '#ffffff' },
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
      // Required fields: red label and red "*" (also while focused).
      MuiFormLabel: {
        styleOverrides: {
          root: ({ theme }) => ({ '&.Mui-required, &.Mui-required.Mui-focused': { color: theme.palette.error.main } }),
          asterisk: ({ theme }) => ({ color: theme.palette.error.main }),
        },
      },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiPaper: { defaultProps: { elevation: 0 } },
    },
  });
}
