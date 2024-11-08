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
    onTickerChange(value);
  }, [onTickerChange]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onTickerBlur(e);
  }, [onTickerBlur]);

  return (
    <TickerAutocomplete
      value={ticker}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
    />
  );
});

export default TickerInput; 