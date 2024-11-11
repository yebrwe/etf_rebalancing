import React from 'react';
import { ETF, Trade } from '@/types/portfolio';
import TickerInput from './TickerInput';

interface Props {
  trades: Trade[];
  etfList: ETF[];
  setEtfList: (etfs: ETF[]) => void;
  parseFormattedNumber: (value: string) => number;
  onRemoveETF: (index: number) => void;
  TARGET_RATIOS: number[];
  setTargetRatios: (ratios: number[]) => void;
  onTickerChange: (index: number, value: string) => void;
  onTickerBlur: (index: number, value: string) => void;
}

export default function PortfolioMobileView({
  trades,
  etfList,
  setEtfList,
  parseFormattedNumber,
  onRemoveETF,
  TARGET_RATIOS,
  setTargetRatios,
  onTickerChange,
  onTickerBlur
}: Props) {
  return (
    <div className="md:hidden space-y-4">
      {trades.map((trade, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <TickerInput
                ticker={trade.ticker}
                onTickerChange={(value) => {
                  const newList = [...etfList];
                  newList[index].ticker = value;
                  setEtfList(newList);
                }}
                onTickerBlur={(e) => {
                  const newList = [...etfList];
                  newList[index].ticker = e.target.value.toUpperCase();
                  setEtfList(newList);
                }}
                className="w-32 mr-4"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="w-24 text-right border rounded p-1 bg-white text-gray-900"
                value={trade.currentQuantity > 0 ? trade.currentQuantity : ''}
                onChange={(e) => {
                  const newList = [...etfList];
                  newList[index].quantity = parseFormattedNumber(e.target.value);
                  setEtfList(newList);
                }}
                placeholder="수량"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-600">현재가: ${trade.price.toFixed(2)}</div>
            <div className="text-right text-gray-600">
              현재 비중: {trade.currentWeight.toFixed(2)}%
            </div>
            <div className="text-gray-600">
              목표 비중: 
              <div className="inline-flex items-center">
                <input
                  type="text"
                  className="w-16 ml-2 text-right border rounded p-1 bg-white text-gray-900"
                  value={TARGET_RATIOS[index] || ''}
                  onChange={(e) => {
                    const newRatios = [...TARGET_RATIOS];
                    const value = parseFloat(e.target.value);
                    newRatios[index] = isNaN(value) ? 0 : value;
                    setTargetRatios(newRatios);
                  }}
                  placeholder="0"
                />
                <span className="ml-1 text-gray-600">%</span>
              </div>
            </div>
            <div className="text-right text-gray-600">
              조정 후: {trade.newWeight.toFixed(2)}%
            </div>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className={`px-2 py-1 rounded-full ${
              trade.quantityDiff === 0 
                ? 'bg-gray-100 text-gray-600' 
                : trade.quantityDiff > 0 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
            }`}>
              {trade.quantityDiff === 0
                ? '조정 불필요'
                : `${Math.abs(trade.quantityDiff)}주 ${
                    trade.quantityDiff > 0 ? '매수' : '매도'
                  }`}
            </span>
            <span className="text-gray-900">
              {Math.round(trade.newValue).toLocaleString()}원
            </span>
          </div>
        </div>
      ))}
    </div>
  );
} 