import type { ReactNode } from 'react';
import { Avatar, Box, Paper, Stack, Typography } from '@mui/material';

interface Props {
  step?: number;
  title: string;
  id?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function Section({ step, title, id, action, children }: Props) {
  return (
    <Paper component="section" id={id} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, scrollMarginTop: 80 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2.5 }}>
        {step !== undefined && (
          <Avatar sx={{ bgcolor: 'primary.main', width: 30, height: 30, fontSize: 15, fontWeight: 700 }}>{step}</Avatar>
        )}
        <Typography variant="h2" component="h2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

export function SubHeading({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h3" component="h3" color="text.secondary" sx={{ mb: 1.5 }}>
      {children}
    </Typography>
  );
}

/** A label / value line used in summaries. */
export function InfoLine({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 2,
        py: 0.75,
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: strong ? 700 : 500, textAlign: 'right', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
    </Box>
  );
}
