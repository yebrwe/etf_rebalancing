import React from 'react';
import { ETF, Trade } from '@/types/portfolio';
import TickerInput from './TickerInput';

interface Props {
  trades: Trade[];
  etfList: ETF[];
  setEtfList: (etfs: ETF[]) => void;
  TARGET_RATIOS: number[];
  setTargetRatios: (ratios: number[]) => void;
  parseFormattedNumber: (value: string) => number;
  onRemoveETF: (index: number) => void;
  onTickerChange: (index: number, value: string) => void;
  onTickerBlur: (index: number, value: string) => void;
}

export default function PortfolioTable({
  trades,
  etfList,
  setEtfList,
  TARGET_RATIOS,
  setTargetRatios,
  parseFormattedNumber,
  onRemoveETF,
  onTickerChange,
  onTickerBlur
}: Props) {
  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full" aria-label="포트폴리오 리밸런싱 상세 정보">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ETF</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">보유수량</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">현재가($)</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">현재 비중</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">목표 비중</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">필요 조정</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">조정 후 비중</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">평가금액</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {trades.map((trade, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 flex items-center gap-2">
                <TickerInput
                  ticker={trade.ticker}
                  onTickerChange={(value) => onTickerChange(index, value)}
                  onTickerBlur={(e) => onTickerBlur(index, e.target.value)}
                  className="w-32"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <input
                  type="text"
                  className="w-20 text-right border rounded p-1 bg-white text-gray-900"
                  value={trade.currentQuantity > 0 ? trade.currentQuantity : ''}
                  onChange={(e) => {
                    const newList = [...etfList];
                    newList[index].quantity = parseFormattedNumber(e.target.value);
                    setEtfList(newList);
                  }}
                  placeholder="수량"
                />
              </td>
              <td className="px-4 py-3 text-right">${trade.price.toFixed(2)}</td>
              <td className="px-4 py-3 text-right">{trade.currentWeight.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right">
                <input
                  type="text"
                  className="w-20 text-right border rounded p-1 bg-white text-gray-900"
                  value={TARGET_RATIOS[index]}
                  onChange={(e) => {
                    const newRatios = [...TARGET_RATIOS];
                    const value = parseFloat(e.target.value);
                    newRatios[index] = isNaN(value) ? 0 : value;
                    setTargetRatios(newRatios);
                  }}
                  placeholder="%"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`px-2 py-1 rounded-full text-sm ${
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
              </td>
              <td className="px-4 py-3 text-right">{trade.newWeight.toFixed(2)}%</td>
              <td className="px-4 py-3 text-right">{Math.round(trade.newValue).toLocaleString()}원</td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => onRemoveETF(index)}
                  className="text-red-600 hover:text-red-800 p-1 rounded"
                  aria-label={`${trade.ticker} ETF 삭제`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 