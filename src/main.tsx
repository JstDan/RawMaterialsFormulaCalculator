import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CssBaseline, ThemeProvider, type PaletteMode } from '@mui/material';
import { COLOR_MODE_KEY, ColorModeContext, DEFAULT_COLOR_MODE, createAppTheme } from './theme';
import { readStorage, writeStorage } from './lib/storage';
import { App } from './App';

function Root() {
  const [mode, setMode] = useState<PaletteMode>(() => {
    const saved = readStorage<PaletteMode>(COLOR_MODE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : DEFAULT_COLOR_MODE;
  });
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () => {
        const next = mode === 'dark' ? 'light' : 'dark';
        writeStorage(COLOR_MODE_KEY, next);
        setMode(next);
      },
    }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
