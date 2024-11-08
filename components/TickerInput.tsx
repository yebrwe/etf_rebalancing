import React, { memo, useCallback } from 'react';
import TickerAutocomplete from './TickerAutocomplete';

interface Props {
  ticker: string;
  onTickerChange: (value: string) => void;
  onTickerBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  className?: string;
}

const TickerInput = memo(function TickerInput({
  ticker,
  onTickerChange,
  onTickerBlur,
  className
}: Props) {
  const handleChange = useCallback((value: string) => {
    onTickerChange(value.toUpperCase());
  }, [onTickerChange]);

  const handleSelect = useCallback((value: string) => {
    const upperValue = value.toUpperCase();
    onTickerChange(upperValue);
    const input = document.createElement('input');
    input.value = upperValue;
    const event = new FocusEvent('blur', { relatedTarget: input }) as unknown as React.FocusEvent<HTMLInputElement>;
    Object.defineProperty(event, 'target', { writable: true, value: input });
    onTickerBlur(event);
  }, [onTickerChange, onTickerBlur]);

  return (
    <TickerAutocomplete
      value={ticker}
      onChange={handleChange}
      onBlur={onTickerBlur}
      onSelect={handleSelect}
      className={className}
    />
  );
});

export default TickerInput; 