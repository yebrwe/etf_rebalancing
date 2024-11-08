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
  // 선택 핸들러 수정
  const handleSelect = useCallback((selectedValue: string) => {
    onTickerChange(selectedValue);
    // 가짜 input 엘리먼트 생성
    const input = document.createElement('input');
    const event = new FocusEvent('blur', { relatedTarget: input }) as unknown as React.FocusEvent<HTMLInputElement>;
    Object.defineProperty(event, 'target', { value: { value: selectedValue } });
    onTickerBlur(event);
  }, [onTickerChange, onTickerBlur]);

  return (
    <TickerAutocomplete
      value={ticker}
      onChange={onTickerChange}
      onBlur={onTickerBlur}
      onSelect={handleSelect}
      className={className}
    />
  );
});

export default TickerInput; 