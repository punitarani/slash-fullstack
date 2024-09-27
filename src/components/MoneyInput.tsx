import { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  maxAmountCents?: number; // Renamed from maxVallue to maxAmountCents
  autoFocus?: boolean; // New prop for auto-focus
}

export function MoneyInput({ value, onChange, maxAmountCents, autoFocus, ...props }: MoneyInputProps) {
  const [displayValue, setDisplayValue] = useState('$0.00');
  const [numericValue, setNumericValue] = useState('0');
  const inputRef = useRef<HTMLInputElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setNumericValue(value);
    setDisplayValue(formatValue(value));
  }, [value]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const formatValue = (val: string): string => {
    const num = Number.parseInt(val, 10) / 100;
    if (Number.isNaN(num)) {
      return '$0.00';
    }
    return num.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.replace(/[^0-9]/g, '');

    // Enforce maxAmountCents while typing
    if (maxAmountCents !== undefined) {
      const currentValue = Number.parseInt(newValue, 10);
      if (currentValue > maxAmountCents) {
        newValue = maxAmountCents.toString();
      }
    }

    const paddedValue = newValue.padStart(3, '0');
    const formattedValue = `$${paddedValue.slice(0, -2)}.${paddedValue.slice(-2)}`;

    setDisplayValue(formattedValue);
    setNumericValue(newValue);
    onChange(newValue);

    moveCursorToEnd();
  };

  const moveCursorToEnd = () => {
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
      }
    }, 0);
  };

  const handleFocus = () => {
    moveCursorToEnd();
  };

  const handleBlur = () => {
    setDisplayValue(formatValue(numericValue));
  };

  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      return;
    }

    clickTimeoutRef.current = setTimeout(() => {
      moveCursorToEnd();
      clickTimeoutRef.current = null;
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (numericValue === '0' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
    }
  };

  const inputClassName = `text-4xl font-extrabold border-none text-center ${displayValue === '$0.00' ? 'text-gray-300' : ''
    } ${props.className || ''}`;

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={inputClassName}
      autoFocus={autoFocus} // Pass autoFocus to the underlying Input component
    />
  );
}
