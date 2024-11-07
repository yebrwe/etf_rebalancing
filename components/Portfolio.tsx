import React, { useEffect, useState } from 'react';
import { ETF, AdjustedTrade } from '@/types/portfolio';

const popularETFs = [
  { ticker: 'SCHD', name: '슈왑 배당 ETF', exchange: 'AMS' },
  { ticker: 'QQQ', name: '나스닥 100 ETF', exchange: 'NAS' },
  { ticker: 'TQQQ', name: '나스닥 100 3X ETF', exchange: 'NAS' },
];

interface PriceData {
  price: number;
  currency: string;
  timestamp: string;
  exchange: string;
}

interface Props {
  initialPortfolio: ETF[];
  currentPrices?: {
    prices: Record<string, PriceData>;
    timestamp: string;
    status: string;
  };
}

const REBALANCING_THRESHOLD = 0.5; // 리밸런싱 오차 허용 범위 (%)
const MIN_REMAINING_CASH = 1; // 최소 남은 예수금 ($)

const TARGET_RATIOS = [80, 15, 5]; // SCHD:QQQ:TQQQ 비율
const ADDITIONAL_CASH_RATIO = 0.1; // 추가 예수금 비율 (5%)

interface RebalanceScenario {
  trades: {
    ticker: string;
    currentQuantity: number;
    newQuantity: number;
    quantityDiff: number;
    currentValue: number;
    newValue: number;
    currentWeight: number;
    newWeight: number;
    targetWeight: number;
    price: number;
  }[];
  totalAssetValue: number;
  totalAssetValueKRW: number;
  additionalCashNeeded: number;
  remainingCash: number;
  maxWeightDiff: number;
  totalWeightDiff: number;
  needsRebalancing: boolean;
}

const calculateRebalanceScenario = (
  portfolio: ETF[],
  prices: Record<string, PriceData>,
  cashBalanceKRW: number,
  exchangeRate: number,
  useAdditionalCash: boolean,
  effectiveAdditionalCashRatio: number
): RebalanceScenario => {
  // 1. 현재 총 자산을 원화로 계산 (예수금 + ETF 자산)
  const totalAssetKRW = portfolio.reduce((sum, etf) => {
    const etfValueKRW = etf.quantity * (prices[etf.ticker]?.price || 0) * exchangeRate;
    return sum + etfValueKRW;
  }, cashBalanceKRW);

  // 현재 비중 계산 및 리밸런싱 필요 여부 확인
  const currentWeights = portfolio.map((etf, index) => {
    const currentValue = etf.quantity * (prices[etf.ticker]?.price || 0) * exchangeRate;
    const currentWeight = (currentValue / totalAssetKRW) * 100;
    return Math.abs(currentWeight - TARGET_RATIOS[index]);
  });

  // 모든 ETF의 비중 차이가 0.5% 미만인지 확인
  const needsRebalancing = currentWeights.some(diff => diff >= REBALANCING_THRESHOLD);

  // 리밸런싱이 불필요한 경우 현재 상태 그대로 반환
  if (!needsRebalancing) {
    const trades = portfolio.map((etf, index) => {
      const currentValue = etf.quantity * (prices[etf.ticker]?.price || 0) * exchangeRate;
      const currentWeight = (currentValue / totalAssetKRW) * 100;
      return {
        ticker: etf.ticker,
        currentQuantity: etf.quantity,
        newQuantity: etf.quantity,
        quantityDiff: 0,
        currentValue,
        newValue: currentValue,
        currentWeight,
        newWeight: currentWeight,
        targetWeight: TARGET_RATIOS[index],
        price: (prices[etf.ticker]?.price || 0)
      };
    });

    return {
      trades,
      totalAssetValue: totalAssetKRW / exchangeRate,
      totalAssetValueKRW: totalAssetKRW,
      additionalCashNeeded: 0,
      remainingCash: cashBalanceKRW,
      maxWeightDiff: Math.max(...currentWeights),
      totalWeightDiff: currentWeights.reduce((sum, diff) => sum + diff, 0),
      needsRebalancing: false  // 추가된 필드
    };
  }

  // 2. 추가 예수금 계산 (원화)
  const additionalCashKRW = useAdditionalCash ? totalAssetKRW * effectiveAdditionalCashRatio : 0;
  const totalAvailableKRW = totalAssetKRW + additionalCashKRW;

  // 3. 목표 금액 계산 (원화)
  const targetAmounts = TARGET_RATIOS.map((ratio, index) => {
    const targetAmountKRW = (totalAvailableKRW * ratio) / 100;
    const price = prices[portfolio[index].ticker]?.price || 0;
    const priceKRW = price * exchangeRate;
    return {
      ticker: portfolio[index].ticker,
      targetAmountKRW,
      priceKRW,
      currentQuantity: portfolio[index].quantity
    };
  });

  // 4. 필요한 수량 조정 계산
  const trades = targetAmounts.map((target, index) => {
    const currentValue = target.currentQuantity * target.priceKRW;
    const targetQuantity = Math.floor(target.targetAmountKRW / target.priceKRW);
    const quantityDiff = targetQuantity - target.currentQuantity;
    const newValue = targetQuantity * target.priceKRW;

    return {
      ticker: target.ticker,
      currentQuantity: target.currentQuantity,
      newQuantity: targetQuantity,
      quantityDiff,
      currentValue,
      newValue,
      currentWeight: (currentValue / totalAssetKRW) * 100,
      newWeight: (newValue / totalAvailableKRW) * 100,
      targetWeight: TARGET_RATIOS[index],
      price: target.priceKRW / exchangeRate
    };
  });

  // 5. 비중 차이 계산
  const weightDiffs = trades.map(trade => 
    Math.abs(trade.newWeight - trade.targetWeight)
  );
  const maxWeightDiff = Math.max(...weightDiffs);
  const totalWeightDiff = weightDiffs.reduce((sum, diff) => sum + diff, 0);

  // 6. 필요한 추가 예수금과 남은 예수금 계산 (원화)
  const totalBuyValueKRW = trades.reduce((sum, trade) => 
    trade.quantityDiff > 0 ? sum + (trade.quantityDiff * trade.price * exchangeRate) : sum
  , 0);

  const totalSellValueKRW = trades.reduce((sum, trade) => 
    trade.quantityDiff < 0 ? sum + (Math.abs(trade.quantityDiff) * trade.price * exchangeRate) : sum
  , 0);

  const availableCashKRW = cashBalanceKRW + totalSellValueKRW;
  const additionalCashNeeded = Math.max(0, totalBuyValueKRW - availableCashKRW);
  const remainingCash = Math.max(0, availableCashKRW - totalBuyValueKRW);

  return {
    trades,
    totalAssetValue: totalAssetKRW / exchangeRate,
    totalAssetValueKRW: totalAssetKRW,
    additionalCashNeeded,
    remainingCash,
    maxWeightDiff,
    totalWeightDiff,
    needsRebalancing: true  // 추가된 필드
  };
};

// 숫자 포맷팅 함수 추가
const formatNumber = (value: number) => {
  return value.toLocaleString('ko-KR');
};

// 숫자 문자열에서 쉼표 제거 함수 추가
const parseFormattedNumber = (value: string) => {
  return Number(value.replace(/,/g, '')) || 0;
};

export default function Portfolio({ initialPortfolio, currentPrices }: Props) {
  const [etfList, setEtfList] = React.useState<ETF[]>(initialPortfolio);
  const [exchangeRate, setExchangeRate] = useState<number>(1300);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [useAdditionalCash, setUseAdditionalCash] = useState<boolean>(false);
  const [additionalCashType, setAdditionalCashType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [additionalCashPercent, setAdditionalCashPercent] = useState<number>(5);
  const [additionalCashFixed, setAdditionalCashFixed] = useState<number>(0);

  useEffect(() => {
    fetch('/api/exchange/rate')
      .then(res => res.json())
      .then(data => {
        if (data.rate) {
          setExchangeRate(data.rate);
        }
      })
      .catch(error => console.error('환율 조회 실패:', error));
  }, []);

  const results = React.useMemo(() => {
    if (!currentPrices?.prices) return null;

    let effectiveAdditionalCashRatio = 0;
    if (useAdditionalCash) {
      if (additionalCashType === 'percent') {
        effectiveAdditionalCashRatio = additionalCashPercent / 100;
      } else if (additionalCashType === 'fixed') {
        // 고정 금액을 비율로 변환
        const totalAssetKRW = etfList.reduce((sum, etf) => {
          return sum + etf.quantity * (currentPrices.prices[etf.ticker]?.price || 0) * exchangeRate;
        }, cashBalance);
        effectiveAdditionalCashRatio = additionalCashFixed / totalAssetKRW;
      }
    }

    return calculateRebalanceScenario(
      etfList,
      currentPrices.prices,
      cashBalance,
      exchangeRate,
      useAdditionalCash,
      effectiveAdditionalCashRatio
    );
  }, [etfList, currentPrices, cashBalance, exchangeRate, useAdditionalCash, additionalCashType, additionalCashPercent, additionalCashFixed]);

  // 예수금 입력 핸들러 수정
  const handleCashBalanceChange = (value: string) => {
    const numericValue = parseFormattedNumber(value);
    setCashBalance(numericValue);
  };

  return (
    <div className="p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">ETF 포트폴리오 리밸런싱</h2>
      <div className="mb-4 space-y-4">

        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useAdditionalCash"
              className="mr-2"
              checked={useAdditionalCash}
              onChange={(e) => {
                setUseAdditionalCash(e.target.checked);
                if (!e.target.checked) {
                  setAdditionalCashType('none');
                }
              }}
            />
            <label htmlFor="useAdditionalCash" className="text-sm text-gray-700">
              추가 예수금 사용
            </label>
          </div>

          {useAdditionalCash && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="additionalCashType"
                    checked={additionalCashType === 'percent'}
                    onChange={() => setAdditionalCashType('percent')}
                  />
                  <span className="ml-2">비율로 설정</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="additionalCashType"
                    checked={additionalCashType === 'fixed'}
                    onChange={() => setAdditionalCashType('fixed')}
                  />
                  <span className="ml-2">금액으로 설정</span>
                </label>
              </div>

              {additionalCashType === 'percent' && (
                <div className="flex items-center space-x-2">
                  <select
                    className="form-select border rounded p-1"
                    value={additionalCashPercent}
                    onChange={(e) => setAdditionalCashPercent(Number(e.target.value))}
                  >
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={15}>15%</option>
                    <option value={20}>20%</option>
                  </select>
                  <span>총 자산 대비</span>
                </div>
              )}

              {additionalCashType === 'fixed' && (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    className="form-input border rounded p-1"
                    value={formatNumber(additionalCashFixed)}
                    onChange={(e) => setAdditionalCashFixed(parseFormattedNumber(e.target.value))}
                    placeholder="추가 예수금 입력"
                  />
                  <span>원</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {results && (
        <>
          <div>총 포트폴리오 가치: ${results.totalAssetValue.toLocaleString()}</div>
          <div>≈ {Math.round(results.totalAssetValueKRW).toLocaleString()}원 (1$ = {Math.round(exchangeRate).toLocaleString()}원)</div>
          
          {!results.needsRebalancing ? (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-800">
                현재 포트폴리오의 비중이 목표 비중과 충분히 근접하여 리밸런싱이 불필요합니다.
                (최대 오차: {results.maxWeightDiff.toFixed(2)}%)
              </p>
            </div>
          ) : results.additionalCashNeeded > 0 ? (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700">추가 필요 예수금: {Math.round(results.additionalCashNeeded).toLocaleString()}원</p>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="font-semibold text-green-800">
                현재 예수금으로 리밸런싱 실행 가능
              </p>
            </div>
          )}
        </>
      )}

      {/* 리밸런싱 결과 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left">ETF</th>
              <th className="px-4 py-3 text-right">보유수량</th>
              <th className="px-4 py-3 text-right">현재가($)</th>
              <th className="px-4 py-3 text-right">현재 비중</th>
              <th className="px-4 py-3 text-right">목표 비중</th>
              <th className="px-4 py-3 text-right">필요 조정</th>
              <th className="px-4 py-3 text-right">조정 후 비중</th>
              <th className="px-4 py-3 text-right">평가금액($)</th>
              <th className="px-4 py-3 text-right">평가금액(원)</th>
            </tr>
          </thead>
          <tbody>
            {results?.trades.map((trade, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">{trade.ticker}</td>
                <td className="px-4 py-3 text-right">
                  <input
                    type="text"
                    className="w-20 text-right border rounded"
                    value={trade.currentQuantity}
                    onChange={(e) => {
                      const newList = [...etfList];
                      newList[index].quantity = parseFormattedNumber(e.target.value);
                      setEtfList(newList);
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-right">${trade.price.toFixed(2)}</td>
                <td className="px-4 py-3 text-right">{trade.currentWeight.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">{trade.targetWeight}%</td>
                <td className="px-4 py-3 text-right">
                  {trade.quantityDiff === 0
                    ? '조정 불필요'
                    : `${Math.abs(trade.quantityDiff)}주 ${
                        trade.quantityDiff > 0 ? '매수' : '매도'
                      }`}
                </td>
                <td className="px-4 py-3 text-right">{trade.newWeight.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">${(trade.newValue / exchangeRate).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Math.round(trade.newValue).toLocaleString()}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 리밸런싱 요약 정보 */}
      {results && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p>총 자산: {Math.round(results.totalAssetValueKRW).toLocaleString()}원</p>
              <p>남은 예수금: {Math.round(results.remainingCash).toLocaleString()}원</p>
              {useAdditionalCash && (
                <p className="text-blue-600">
                  {additionalCashType === 'percent' 
                    ? `추가 예수금 (${additionalCashPercent}%): ${Math.round(results.totalAssetValueKRW * (additionalCashPercent / 100)).toLocaleString()}원`
                    : `추가 예수금: ${Math.round(additionalCashFixed).toLocaleString()}원`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 