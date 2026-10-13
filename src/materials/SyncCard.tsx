import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useData } from '../data/DataContext';
import { extractSheetId } from '../lib/materialImport';
import { fmt, t } from '../i18n';

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

/** Status of the Google Sheet price-list sync with a manual "Sync" button. */
export function SyncCard({ onSynced }: { onSynced: (message: string, ok: boolean) => void }) {
  const { lastSync, syncing, syncNow, settings } = useData();
  const fileId = extractSheetId(settings.google_sheet_url);

  const sync = async () => {
    try {
      const run = await syncNow('manual');
      if (run.status === 'success') onSynced(fmt(t.sync.okShort, { added: run.added, changed: run.changed }), true);
      else onSynced(`${t.sync.failed}: ${run.error ?? ''}`, false);
    } catch (e) {
      onSynced(`${t.sync.failed}: ${(e as Error).message}`, false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'flex-start' } }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h3" component="h2">
            {t.sync.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t.sync.hint}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {fileId && (
            <Button
              color="inherit"
              startIcon={<OpenInNewIcon />}
              href={settings.google_sheet_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.sync.openSheet}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            onClick={sync}
            disabled={syncing || !fileId}
          >
            {syncing ? t.sync.syncing : t.sync.syncNow}
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ mt: 1.5 }}>
        {!lastSync ? (
          <Typography variant="body2" color="text.secondary">
            {t.sync.never}
          </Typography>
        ) : lastSync.status === 'success' ? (
          <Alert severity="success" sx={{ py: 0 }}>
            <b>
              {t.sync.last}: {formatDateTime(lastSync.created_at)} ({t.sync[`source_${lastSync.source}`]})
            </b>
            <br />
            {fmt(t.sync.ok, { added: lastSync.added, changed: lastSync.changed, unchanged: lastSync.unchanged })}
            {lastSync.invalid > 0 && (
              <>
                <br />
                {fmt(t.sync.invalidRows, { n: lastSync.invalid })}
              </>
            )}
            {lastSync.missing > 0 && (
              <>
                <br />
                {fmt(t.sync.missing, { n: lastSync.missing })}
              </>
            )}
          </Alert>
        ) : (
          <Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { overflowWrap: 'anywhere' } }}>
            <b>
              {t.sync.failed}: {formatDateTime(lastSync.created_at)} ({t.sync[`source_${lastSync.source}`]})
            </b>
            <br />
            {lastSync.error}
          </Alert>
        )}
      </Box>
    </Paper>
  );
}
