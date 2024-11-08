import React, { memo } from 'react';
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
  return (
    <TickerAutocomplete
      value={ticker}
      onChange={onTickerChange}
      onBlur={onTickerBlur}
      className={className}
    />
  );
});

export default TickerInput; 