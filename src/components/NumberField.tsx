import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';
import { evaluateExpression, hasOperator } from '../lib/expression';
import { sanitizeDecimalInput } from '../lib/numbers';

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
  /** Whole numbers only. */
  integer?: boolean;
  suffix?: string;
  /** Accept arithmetic like "3260-5%"; Enter (or leaving the field) replaces it with the result. */
  calculator?: boolean;
};

const EXPRESSION_CHARS = /[^\d.,+\-*/x×÷%()\s]/gi;

/** Text input for numbers: right-aligned, accepts comma or dot as decimal separator. */
export function NumberField({ value, onChange, integer, suffix, calculator, slotProps, onKeyDown, onBlur, ...rest }: Props) {
  const sanitize = (input: string) =>
    calculator && hasOperator(input) ? input.replace(EXPRESSION_CHARS, '') : sanitizeDecimalInput(input, !integer);

  /** Replace an expression with its result (2 decimals, or a whole number for integer fields). */
  const evaluate = () => {
    if (!calculator || !hasOperator(value)) return;
    const result = evaluateExpression(value);
    if (result === null) return;
    const rounded = integer ? Math.round(result) : Math.round(result * 100) / 100;
    onChange(String(rounded));
  };

  return (
    <TextField
      {...rest}
      value={value}
      onChange={(e) => onChange(sanitize(e.target.value))}
      onKeyDown={(e) => {
        if (calculator && e.key === 'Enter') {
          e.preventDefault();
          evaluate();
        }
        onKeyDown?.(e);
      }}
      onBlur={(e) => {
        evaluate();
        onBlur?.(e);
      }}
      slotProps={{
        ...slotProps,
        htmlInput: {
          inputMode: calculator ? 'text' : integer ? 'numeric' : 'decimal',
          autoComplete: 'off',
          ...slotProps?.htmlInput,
        },
        input: suffix
          ? { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment>, ...slotProps?.input }
          : slotProps?.input,
      }}
    />
  );
}
