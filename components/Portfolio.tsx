import React, { useEffect, useState } from 'react';
import { ETF, AdjustedTrade } from '@/types/portfolio';

const popularETFs = [
  { ticker: 'SCHD', name: 'SCHD' },
  { ticker: 'QQQ', name: 'QQQ' },
  { ticker: 'TQQQ', name: 'TQQQ' },
  { ticker: 'VOO', name: 'VOO' },
  { ticker: 'VTI', name: 'VTI' },
  { ticker: 'JEPI', name: 'JEPI' },
  { ticker: 'QYLD', name: 'QYLD' },
];

interface PriceData {
  price: number;
  currency: string;
  timestamp: string;
}

interface Props {
  initialPortfolio: ETF[];
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

export default function Portfolio({ initialPortfolio }: Props) {
  const [etfList, setEtfList] = React.useState<ETF[]>(initialPortfolio);
  const [exchangeRate, setExchangeRate] = useState<number>(1300);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [useAdditionalCash, setUseAdditionalCash] = useState<boolean>(false);
  const [additionalCashType, setAdditionalCashType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [additionalCashPercent, setAdditionalCashPercent] = useState<number>(5);
  const [additionalCashFixed, setAdditionalCashFixed] = useState<number>(0);
  const [targetRatios, setTargetRatios] = useState<number[]>([80, 15, 5]);

  const [currentPrices, setCurrentPrices] = useState<{
    prices: Record<string, PriceData>;
    timestamp: string;
    status: string;
  } | null>(null);

  useEffect(() => {
    // 환율 조회를 야후 API로 변경
    fetch('/api/yahoo/rate?from=USD&to=KRW')
      .then(res => res.json())
      .then(data => {
        if (data.rate) {
          setExchangeRate(data.rate);
        }
      })
      .catch(error => console.error('환율 조회 실패:', error));
  }, []);

  // 가격 데이터 가져오는 함수
  const fetchPrices = async (tickers: string) => {
    try {
      const response = await fetch(`/api/yahoo/price?tickers=${tickers}`);
      const data = await response.json();
      
      if (data.prices) {
        setCurrentPrices(data);
      }
    } catch (error) {
      console.error('가격 조회 실패:', error);
    }
  };

  // 초기 가격 데이터 로드
  useEffect(() => {
    const tickers = etfList.map(etf => etf.ticker).join(',');
    fetchPrices(tickers);
  }, [etfList]);

  const results = React.useMemo(() => {
    if (!currentPrices?.prices) return null;

    let effectiveAdditionalCashRatio = 0;
    if (useAdditionalCash) {
      if (additionalCashType === 'percent') {
        effectiveAdditionalCashRatio = additionalCashPercent / 100;
      } else if (additionalCashType === 'fixed') {
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


  if (!results) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg">
      <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 border-b pb-4">ETF 포트폴리오 리밸런싱</h2>
      
      

      {/* 리밸런싱 결과 영역 */}
      {results && (
        <>

          {/* 리밸런싱 결과 - 모바일에서는 카드 형태로 표시 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.trades.map((trade, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <input
                        type="text"
                        className="w-32 border rounded p-1"
                        defaultValue={trade.ticker}
                        onBlur={async (e) => {
                          const ticker = e.target.value.toUpperCase();
                          const newList = [...etfList];
                          newList[index].ticker = ticker;
                          setEtfList(newList);
                          
                          const tickers = newList.map(etf => etf.ticker).join(',');
                          await fetchPrices(tickers);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder="티커 입력"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="text"
                        className="w-20 text-right border rounded p-1"
                        value={trade.currentQuantity || ''}
                        onChange={(e) => {
                          const newList = [...etfList];
                          newList[index].quantity = parseFormattedNumber(e.target.value);
                          setEtfList(newList);
                        }}
                        onBlur={async () => {
                          const tickers = etfList.map(etf => etf.ticker).join(',');
                          await fetchPrices(tickers);
                        }}
                        placeholder="수량"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">${trade.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">{trade.currentWeight.toFixed(2)}%</td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="text"
                        className="w-20 text-right border rounded p-1"
                        defaultValue={trade.targetWeight}
                        onBlur={(e) => {
                          const newRatios = [...TARGET_RATIOS];
                          newRatios[index] = parseFloat(e.target.value) || TARGET_RATIOS[index];
                          setTargetRatios(newRatios);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 모바일용 카드 뷰 */}
          <div className="md:hidden space-y-4">
            {results.trades.map((trade, index) => (
              <div key={index} className="bg-white p-4 rounded-lg shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="w-32 border rounded p-1"
                      defaultValue={trade.ticker}
                      onBlur={(e) => {
                        const newList = [...etfList];
                        newList[index].ticker = e.target.value.toUpperCase();
                        setEtfList(newList);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      placeholder="티커 입력"
                    />
                  </div>
                  <input
                    type="text"
                    className="w-24 text-right border rounded p-1"
                    value={trade.currentQuantity || ''}
                    onChange={(e) => {
                      const newList = [...etfList];
                      newList[index].quantity = parseFormattedNumber(e.target.value);
                      setEtfList(newList);
                    }}
                    placeholder="수량"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>현재가: ${trade.price.toFixed(2)}</div>
                  <div className="text-right">현재 비중: {trade.currentWeight.toFixed(2)}%</div>
                  <div>목표 비중: {trade.targetWeight}%</div>
                  <div className="text-right">조정 후: {trade.newWeight.toFixed(2)}%</div>
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
                  <span>{Math.round(trade.newValue).toLocaleString()}원</span>
                </div>
              </div>
            ))}
          </div>

          {/* 요약 보 */}
          <div className="mt-6 bg-white p-4 rounded-lg shadow-sm space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">총 포트리오 가치</p>
                <p className="text-lg font-medium">
                    {Math.round(results.totalAssetValueKRW).toLocaleString()}원
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">남은 예수금</p>
                <p className="text-lg font-medium">
                  {Math.round(results.remainingCash).toLocaleString()}원
                </p>
              </div>
              {useAdditionalCash && (
                <div>
                  <p className="text-sm text-gray-600">추가 예수금</p>
                  <p className="text-lg font-medium text-blue-600">
                    {additionalCashType === 'percent' 
                      ? `${additionalCashPercent}% (${Math.round(results.totalAssetValueKRW * (additionalCashPercent / 100)).toLocaleString()}원)`
                      : `${Math.round(additionalCashFixed).toLocaleString()}원`}
                  </p>
                </div>
              )}
            </div>
          </div>

          
        </>
      )}
      {/* 추가 예수금 설정 영역 */}
      <div className="mb-6 space-y-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="useAdditionalCash"
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              checked={useAdditionalCash}
              onChange={(e) => {
                setUseAdditionalCash(e.target.checked);
                if (e.target.checked) {
                  setAdditionalCashType('percent');
                  setAdditionalCashPercent(10);
                } else {
                  setAdditionalCashType('none');
                }
              }}
            />
            <label htmlFor="useAdditionalCash" className="ml-2 text-sm font-medium text-gray-700">
              추가 예수금 사용
            </label>
          </div>

          {useAdditionalCash && (
            <div className="ml-6 space-y-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="w-4 h-4 text-blue-600"
                    name="additionalCashType"
                    checked={additionalCashType === 'percent'}
                    onChange={() => setAdditionalCashType('percent')}
                  />
                  <span className="ml-2 text-sm">비율로 설정</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="w-4 h-4 text-blue-600"
                    name="additionalCashType"
                    checked={additionalCashType === 'fixed'}
                    onChange={() => setAdditionalCashType('fixed')}
                  />
                  <span className="ml-2 text-sm">금액으로 설정</span>
                </label>
              </div>

              {additionalCashType === 'percent' && (
                <div className="flex items-center gap-2">
                  <select
                    className="form-select rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    value={additionalCashPercent}
                    onChange={(e) => setAdditionalCashPercent(Number(e.target.value))}
                  >
                    <option value={5}>5%</option>
                    <option value={10}>10%</option>
                    <option value={15}>15%</option>
                    <option value={20}>20%</option>
                  </select>
                  <span className="text-sm text-gray-600">총 자산 대비</span>
                </div>
              )}

              {additionalCashType === 'fixed' && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formatNumber(additionalCashFixed)}
                    onChange={(e) => setAdditionalCashFixed(parseFormattedNumber(e.target.value))}
                    placeholder="추가 예수금 입력"
                  />
                  <span className="text-sm text-gray-600">원</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 