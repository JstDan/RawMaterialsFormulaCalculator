import type { ReactNode } from 'react';
import {
  Box,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

export interface Column<T> {
  key: string;
  label: ReactNode;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Column width on the table layout, e.g. '20%' or 120. */
  width?: string | number;
  /** Shown as the card title on small screens instead of a label/value line. */
  primary?: boolean;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  getKey: (row: T) => string;
  footer?: ReactNode[];
  empty?: ReactNode;
}

/**
 * Table on wide screens, stacked cards below the `md` breakpoint – never scrolls horizontally.
 * The table uses a fixed layout and wraps long words instead of overflowing.
 */
export function ResponsiveTable<T>({ rows, columns, getKey, footer, empty }: Props<T>) {
  const theme = useTheme();
  const wide = useMediaQuery(theme.breakpoints.up('md'));

  if (!rows.length && empty) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        {empty}
      </Typography>
    );
  }

  if (wide) {
    return (
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%', '& td, & th': { overflowWrap: 'anywhere' } }}>
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key} align={c.align} sx={{ width: c.width, fontWeight: 600, color: 'text.secondary' }}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getKey(row)} hover>
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
        {footer && (
          <TableFooter>
            <TableRow>
              {footer.map((cell, i) => (
                <TableCell
                  key={i}
                  align={columns[i]?.align}
                  sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.875rem' }}
                >
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    );
  }

  const primary = columns.find((c) => c.primary);
  const rest = columns.filter((c) => !c.primary);
  return (
    <Stack spacing={1.5}>
      {rows.map((row) => (
        <Paper key={getKey(row)} variant="outlined" sx={{ p: 1.5 }}>
          {primary && <Box sx={{ fontWeight: 600, mb: 1, overflowWrap: 'anywhere' }}>{primary.render(row)}</Box>}
          {rest.map((c) => (
            <Box key={c.key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, py: 0.25 }}>
              {c.label && (
                <Typography variant="body2" color="text.secondary">
                  {c.label}
                </Typography>
              )}
              <Box sx={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere', ml: 'auto' }}>
                {c.render(row)}
              </Box>
            </Box>
          ))}
        </Paper>
      ))}
      {footer && (
        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
          {footer.map(
            (cell, i) =>
              cell !== '' &&
              cell !== null && (
                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, fontWeight: 700 }}>
                  <span>{i === 0 ? cell : columns[i]?.label}</span>
                  {i !== 0 && <span>{cell}</span>}
                </Box>
              ),
          )}
        </Paper>
      )}
    </Stack>
  );
}
