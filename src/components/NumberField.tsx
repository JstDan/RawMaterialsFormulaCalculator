import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { sanitizeDecimalInput } from '../lib/numbers';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
  /** Whole numbers only. */
  integer?: boolean;
  suffix?: string;
};

/** Text input for numbers: right-aligned, accepts comma or dot as decimal separator. */
export function NumberField({ value, onChange, integer, suffix, slotProps, ...rest }: Props) {
  return (
    <TextField
      {...rest}
      value={value}
      onChange={(e) => onChange(sanitizeDecimalInput(e.target.value, !integer))}
      slotProps={{
        ...slotProps,
        htmlInput: { inputMode: integer ? 'numeric' : 'decimal', autoComplete: 'off', ...slotProps?.htmlInput },
        input: suffix
          ? { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment>, ...slotProps?.input }
          : slotProps?.input,
      }}
    />
  );
}
