import React, { useEffect, useState, Suspense, useCallback, useMemo, memo } from 'react';
import { ETF, Trade, RebalanceScenario, PriceData } from '@/types/portfolio';
import { usePerformance } from '@/hooks/usePerformance';
import { useETFPrices, useExchangeRate } from '@/hooks/useETFData';
import { saveToStorage, loadFromStorage, clearStorage } from '@/lib/storage';
import PortfolioTable from './PortfolioTable';
import PortfolioMobileView from './PortfolioMobileView';
import PortfolioSummary from './PortfolioSummary';
import AdditionalCashSettings from './AdditionalCashSettings';
import TickerInput from './TickerInput';

// 캐시 키 생성 함수
const generateCacheKey = (tickers: string) => `price_${tickers}_${new Date().toISOString().split('T')[0]}`;

// API 요청에 캐시 적용
const fetchWithCache = async (url: string, cacheKey: string) => {
  // 브라우저 캐시 확인
  const cachedData = sessionStorage.getItem(cacheKey);
  if (cachedData) {
    return JSON.parse(cachedData);
  }

  const response = await fetch(url);
  const data = await response.json();
  
  // 캐시 저장
  sessionStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
};

// 가격 데이터 가져오는 함 최적화
const fetchPrices = async (tickers: string) => {
  try {
    const cacheKey = generateCacheKey(tickers);
    const data = await fetchWithCache(`/api/yahoo/price?tickers=${tickers}`, cacheKey);
    
    if (data.prices) {
      return data;
    }
    throw new Error('가격 데이터 없음');
  } catch (error) {
    console.error('가격 조회 실패:', error);
    return null;
  }
};

// 디바운스 훅 타입 정의
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface Props {
  initialPortfolio: ETF[];
}

const REBALANCING_THRESHOLD = 0.5; // 리밸런싱 오차 허용 범위 (%)
const MIN_REMAINING_CASH = 1; // 최소 남은 예수금 ($)

const ADDITIONAL_CASH_RATIO = 0.1; // 추가 예수금 비율 (5%)

const calculateRebalanceScenario = (
  portfolio: ETF[],
  prices: Record<string, PriceData>,
  cashBalanceKRW: number,
  exchangeRate: number,
  useAdditionalCash: boolean,
  effectiveAdditionalCashRatio: number,
  targetRatios: number[],
  additionalCashType: 'none' | 'percent' | 'fixed',
  additionalCashFixed: number
): RebalanceScenario => {
  // 1. 현재 총 자산을 원화로 계산 (예수금 + ETF 자산)
  const totalAssetKRW = portfolio.reduce((sum, etf) => {
    const price = prices[etf.ticker]?.price || 0;
    const etfValueKRW = etf.quantity * price * exchangeRate;
    return sum + etfValueKRW;
  }, cashBalanceKRW);

  // 2. 추가 예수금 계산 (원화)
  const additionalCashKRW = useAdditionalCash ? totalAssetKRW * effectiveAdditionalCashRatio : 0;
  const totalAvailableKRW = totalAssetKRW + additionalCashKRW;

  // 모든 ETF의 수량이 0이고 추가 예수금이 있는 경우
  const allQuantitiesZero = portfolio.every(etf => etf.quantity === 0);
  const hasAdditionalCash = useAdditionalCash && additionalCashType === 'fixed' && additionalCashFixed > 0;

  if (allQuantitiesZero && hasAdditionalCash) {
    // 추가 예수금만으로 리밸런싱 계산
    const trades = portfolio.map((etf, index) => {
      const price = prices[etf.ticker]?.price || 0;
      const priceKRW = price * exchangeRate;
      const targetAmountKRW = (additionalCashFixed * (targetRatios[index] / 100));
      const targetQuantity = Math.floor(targetAmountKRW / priceKRW);
      const newValue = targetQuantity * priceKRW;

      return {
        ticker: etf.ticker,
        currentQuantity: 0,
        newQuantity: targetQuantity,
        quantityDiff: targetQuantity,
        currentValue: 0,
        newValue,
        currentWeight: 0,
        newWeight: (newValue / additionalCashFixed) * 100,
        targetWeight: targetRatios[index],
        price
      };
    });

    return {
      trades,
      totalAssetValue: additionalCashFixed / exchangeRate,
      totalAssetValueKRW: additionalCashFixed,
      additionalCashNeeded: 0,
      remainingCash: additionalCashFixed - trades.reduce((sum, trade) => 
        sum + (trade.newQuantity * trade.price * exchangeRate), 0),
      maxWeightDiff: 0,
      totalWeightDiff: 0,
      needsRebalancing: true
    };
  }

  // 현재 비중 계산 및 리밸런싱 필요 여부 확인
  const currentWeights = portfolio.map((etf, index) => {
    const price = prices[etf.ticker]?.price || 0;
    const currentValue = etf.quantity * price * exchangeRate;
    const currentWeight = totalAssetKRW > 0 ? (currentValue / totalAssetKRW) * 100 : 0;
    return Math.abs(currentWeight - (targetRatios[index] || 0));
  });

  // 모든 ETF의 비중 차이가 0.5% 미만인지 확인
  const needsRebalancing = currentWeights.some(diff => diff >= REBALANCING_THRESHOLD);

  // 리밸런싱이 불필요한 경우 현재 상태 그대로 반환
  if (!needsRebalancing) {
    const trades = portfolio.map((etf, index) => {
      const price = prices[etf.ticker]?.price || 0;
      const currentValue = etf.quantity * price * exchangeRate;
      const currentWeight = totalAssetKRW > 0 ? (currentValue / totalAssetKRW) * 100 : 0;
      return {
        ticker: etf.ticker,
        currentQuantity: etf.quantity,
        newQuantity: etf.quantity,
        quantityDiff: 0,
        currentValue,
        newValue: currentValue,
        currentWeight,
        newWeight: currentWeight,
        targetWeight: targetRatios[index] || 0,
        price: prices[etf.ticker]?.price || 0
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

  // 3. 목표 금액 계산 (원화)
  const targetAmounts = targetRatios.map((ratio, index) => {
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
    const price = prices[portfolio[index].ticker]?.price || 0;
    const currentValue = target.currentQuantity * target.priceKRW;
    const targetQuantity = target.priceKRW > 0 ? Math.floor(target.targetAmountKRW / target.priceKRW) : 0;
    const quantityDiff = targetQuantity - target.currentQuantity;
    const newValue = targetQuantity * target.priceKRW;

    return {
      ticker: target.ticker,
      currentQuantity: target.currentQuantity,
      newQuantity: targetQuantity,
      quantityDiff,
      currentValue,
      newValue,
      currentWeight: totalAssetKRW > 0 ? (currentValue / totalAssetKRW) * 100 : 0,
      newWeight: totalAvailableKRW > 0 ? (newValue / totalAvailableKRW) * 100 : 0,
      targetWeight: targetRatios[index] || 0,
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

// ETF 행을 별도의 메모이제이션된 컴포넌트로 분리
const ETFRow = memo(function ETFRow({
  trade,
  index,
  etfList,
  setEtfList,
  TARGET_RATIOS,
  setTargetRatios,
  parseFormattedNumber,
  onRemoveETF,
  onTickerChange,
  onTickerBlur
}: {
  trade: Trade;
  index: number;
  etfList: ETF[];
  setEtfList: (etfs: ETF[]) => void;
  TARGET_RATIOS: number[];
  setTargetRatios: (ratios: number[]) => void;
  parseFormattedNumber: (value: string) => number;
  onRemoveETF: (index: number) => void;
  onTickerChange: (index: number, value: string) => void;
  onTickerBlur: (index: number, value: string) => void;
}) {
  const handleQuantityChange = useCallback((value: string) => {
    const newList = [...etfList];
    newList[index].quantity = parseFormattedNumber(value);
    setEtfList(newList);
  }, [etfList, index, setEtfList, parseFormattedNumber]);

  const handleRatioChange = useCallback((value: string) => {
    const newRatios = [...TARGET_RATIOS];
    const parsedValue = parseFloat(value);
    newRatios[index] = isNaN(parsedValue) ? 0 : parsedValue;
    setTargetRatios(newRatios);
  }, [TARGET_RATIOS, index, setTargetRatios]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
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
          className="w-20 text-right border rounded p-1"
          value={trade.currentQuantity}
          onChange={(e) => handleQuantityChange(e.target.value)}
          placeholder="수량"
        />
      </td>
      {/* ... 나머지 셀들 ... */}
    </tr>
  );
});

export default function Portfolio({ initialPortfolio }: Props) {
  usePerformance('Portfolio');
  
  // 든 state를 최상단에 선언
  const [initialized, setInitialized] = useState(false);
  const [etfList, setEtfList] = useState<ETF[]>(initialPortfolio);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [useAdditionalCash, setUseAdditionalCash] = useState<boolean>(false);
  const [additionalCashType, setAdditionalCashType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [additionalCashPercent, setAdditionalCashPercent] = useState<number>(5);
  const [additionalCashFixed, setAdditionalCashFixed] = useState<number>(0);
  const [targetRatios, setTargetRatios] = useState<number[]>(new Array(initialPortfolio.length).fill(0));

  // 모든 useCallback을 state 선언 직후에 배치
  const handleTickerChange = useCallback((index: number, value: string) => {
    setEtfList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], ticker: value };
      return newList;
    });
  }, []);

  const handleTickerBlur = useCallback((index: number, value: string) => {
    setEtfList(prev => {
      const newList = [...prev];
      newList[index] = { ...newList[index], ticker: value.toUpperCase() };
      return newList;
    });
  }, []);

  // ETF 추가 함수 최적화
  const addETF = useCallback(() => {
    setEtfList(prev => [...prev, { ticker: '', quantity: 0 }]);
    setTargetRatios(prev => [...prev, 0]);
  }, []);

  // ETF 삭제 함수 최적화
  const removeETF = useCallback((index: number) => {
    setEtfList(prev => prev.filter((_, i) => i !== index));
    setTargetRatios(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleReset = useCallback(() => {
    if (window.confirm('모든 설정을 초기화하시겠습니까?')) {
      clearStorage();
      setEtfList(initialPortfolio);
      setCashBalance(0);
      setUseAdditionalCash(false);
      setAdditionalCashType('none');
      setAdditionalCashPercent(5);
      setAdditionalCashFixed(0);
      setTargetRatios([80, 15, 5]);
    }
  }, [initialPortfolio]);

  // 디바운스 적용
  const debouncedEtfList = useDebounce<ETF[]>(etfList, 500);
  const tickers = debouncedEtfList.map((etf: ETF) => etf.ticker).join(',');

  // SWR로 데이터 페칭
  const { prices, isLoading: isPricesLoading } = useETFPrices(tickers);
  const { rate: exchangeRate, isLoading: isRateLoading } = useExchangeRate();

  // useEffect를 useCallback 다음에 배치
  useEffect(() => {
    if (typeof window === 'undefined' || initialized) return;

    try {
      const savedData = loadFromStorage();
      console.log('Loading saved data:', savedData);

      if (savedData && savedData.etfList && savedData.etfList.length > 0) {
        // 모든 필수 필드가 있는지 확인
        const isValidData = savedData.etfList.every(
          (etf) => etf && typeof etf.ticker === 'string' && typeof etf.quantity === 'number'
        );

        if (isValidData) {
          console.log('Setting valid etfList:', savedData.etfList);
          setEtfList(savedData.etfList);
          setCashBalance(savedData.cashBalance || 0);
          setUseAdditionalCash(savedData.useAdditionalCash || false);
          setAdditionalCashType(savedData.additionalCashType || 'none');
          setAdditionalCashPercent(savedData.additionalCashPercent || 5);
          setAdditionalCashFixed(savedData.additionalCashFixed || 0);
          setTargetRatios(savedData.targetRatios || new Array(initialPortfolio.length).fill(0));
        } else {
          console.warn('Invalid saved data structure, using initial portfolio');
          setEtfList(initialPortfolio);
        }
      } else {
        console.log('No valid saved data found, using initial portfolio:', initialPortfolio);
        setEtfList(initialPortfolio);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
      setEtfList(initialPortfolio);
    }

    setInitialized(true);
  }, [initialPortfolio, initialized]);

  useEffect(() => {
    if (!initialized || typeof window === 'undefined') return;

    try {
      const result = saveToStorage({
        etfList,
        cashBalance,
        useAdditionalCash,
        additionalCashType,
        additionalCashPercent,
        additionalCashFixed,
        targetRatios
      });
      console.log('Settings saved:', result);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }, [initialized, etfList, cashBalance, useAdditionalCash, additionalCashType, additionalCashPercent, additionalCashFixed, targetRatios]);

  // 결과 계산은 모든 훅 다음에 배치
  const results = useMemo(() => {
    if (!prices || !exchangeRate) return null;

    let effectiveAdditionalCashRatio = 0;
    if (useAdditionalCash) {
      if (additionalCashType === 'percent') {
        effectiveAdditionalCashRatio = additionalCashPercent / 100;
      } else if (additionalCashType === 'fixed') {
        const totalAssetKRW = etfList.reduce((sum, etf) => {
          return sum + etf.quantity * (prices[etf.ticker]?.price || 0) * exchangeRate;
        }, cashBalance);
        effectiveAdditionalCashRatio = additionalCashFixed / totalAssetKRW;
      }
    }

    return calculateRebalanceScenario(
      etfList,
      prices,
      cashBalance,
      exchangeRate,
      useAdditionalCash,
      effectiveAdditionalCashRatio,
      targetRatios,
      additionalCashType,
      additionalCashFixed
    );
  }, [prices, exchangeRate, etfList, cashBalance, useAdditionalCash, additionalCashType, additionalCashPercent, additionalCashFixed, targetRatios]);

  // 로딩 상태 처리
  if (isPricesLoading || isRateLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4" role="alert">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // 목표 비중 합계 계산
  const totalRatio = targetRatios.reduce((sum, ratio) => sum + ratio, 0);

  // 테이블 메모이제이션
  const renderTable = useMemo(() => {
    if (!results) return null;
    
    return (
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            {/* ... 테이블 헤더 ... */}
          </thead>
          <tbody>
            {results.trades.map((trade, index) => (
              <ETFRow
                key={`${trade.ticker}-${index}`}
                trade={trade}
                index={index}
                etfList={etfList}
                setEtfList={setEtfList}
                TARGET_RATIOS={targetRatios}
                setTargetRatios={setTargetRatios}
                parseFormattedNumber={parseFormattedNumber}
                onRemoveETF={removeETF}
                onTickerChange={handleTickerChange}
                onTickerBlur={handleTickerBlur}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [results, etfList, targetRatios]);

  return (
    <article className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg">
      {/* 설정 초기화 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          설정 초기화
        </button>
      </div>

      <header>
        <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          ETF 포트폴리오 리밸런싱
        </h2>
      </header>

      {/* ETF 추가 버튼 */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={addETF}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          ETF 추가
        </button>
        <div className={`text-sm ${totalRatio === 100 ? 'text-green-600' : 'text-red-600'}`}>
          총 목표 비중: {totalRatio}%
        </div>
      </div>

      {renderTable}

      <PortfolioMobileView
        trades={results.trades}
        etfList={etfList}
        setEtfList={setEtfList}
        parseFormattedNumber={parseFormattedNumber}
        onRemoveETF={removeETF}
        TARGET_RATIOS={targetRatios}
        setTargetRatios={setTargetRatios}
        onTickerChange={handleTickerChange}
        onTickerBlur={handleTickerBlur}
      />

      <PortfolioSummary
        results={results}
        useAdditionalCash={useAdditionalCash}
        additionalCashType={additionalCashType}
        additionalCashPercent={additionalCashPercent}
        additionalCashFixed={additionalCashFixed}
      />

      <AdditionalCashSettings
        useAdditionalCash={useAdditionalCash}
        setUseAdditionalCash={setUseAdditionalCash}
        additionalCashType={additionalCashType}
        setAdditionalCashType={setAdditionalCashType}
        additionalCashPercent={additionalCashPercent}
        setAdditionalCashPercent={setAdditionalCashPercent}
        additionalCashFixed={additionalCashFixed}
        setAdditionalCashFixed={setAdditionalCashFixed}
      />
    </article>
  );
} 