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

  // 리밸런싱이 불필요한 경우 현재  그대로 반환
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

  // 6. 필요한  계 (원화)
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
  setTargetRatios: React.Dispatch<React.SetStateAction<number[]>>;
  parseFormattedNumber: (value: string) => number;
  onRemoveETF: (index: number) => void;
  onTickerChange: (index: number, value: string) => void;
  onTickerBlur: (index: number, value: string) => void;
}) {
  // 로컬 상태 추가
  const [ratioInput, setRatioInput] = useState(TARGET_RATIOS[index]?.toString() || '');

  // TARGET_RATIOS가 변경될 때 로컬 상태 업데이트
  useEffect(() => {
    setRatioInput(TARGET_RATIOS[index]?.toString() || '');
  }, [TARGET_RATIOS, index]);

  const handleTickerChange = useCallback((value: string) => {
    onTickerChange(index, value);
  }, [index, onTickerChange]);

  const handleTickerBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    onTickerBlur(index, e.target.value);
  }, [index, onTickerBlur]);

  const handleQuantityChange = useCallback((value: string) => {
    const newList = [...etfList];
    newList[index].quantity = parseFormattedNumber(value);
    setEtfList(newList);
  }, [etfList, index, setEtfList, parseFormattedNumber]);

  const handleRatioChange = useCallback((value: string) => {
    setRatioInput(value); // 로컬 상태 업데이트

    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      const parsedValue = parseFloat(value);
      const newValue = isNaN(parsedValue) ? 0 : Math.min(100, Math.max(0, parsedValue));
      
      setTargetRatios(prev => {
        const newRatios = [...prev];
        newRatios[index] = newValue;
        return newRatios;
      });
    }
  }, [index, setTargetRatios]);

  const handleRatioBlur = useCallback(() => {
    const value = ratioInput;
    if (value === '') {
      handleRatioChange('0');
    } else {
      const parsedValue = parseFloat(value);
      if (!isNaN(parsedValue)) {
        handleRatioChange(parsedValue.toString());
      }
    }
  }, [ratioInput, handleRatioChange]);

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3">
        <TickerInput
          ticker={trade.ticker}
          onTickerChange={handleTickerChange}
          onTickerBlur={handleTickerBlur}
          className="w-32"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="text"
          className="w-20 text-right border rounded p-1"
          value={formatNumber(trade.currentQuantity)}
          onChange={(e) => handleQuantityChange(e.target.value)}
          placeholder="수량"
        />
      </td>
      <td className="px-4 py-3 text-right">
        ${formatNumber(trade.price)}
      </td>
      <td className="px-4 py-3 text-right">
        ₩{formatNumber(Math.round(trade.currentValue))}
      </td>
      <td className="px-4 py-3 text-right">
        {trade.currentWeight.toFixed(1)}%
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="text"
          className="w-20 text-right border rounded p-1"
          value={ratioInput}
          onChange={(e) => handleRatioChange(e.target.value)}
          onBlur={handleRatioBlur}
          placeholder="비중"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <span className={trade.quantityDiff > 0 ? 'text-green-600' : trade.quantityDiff < 0 ? 'text-red-600' : ''}>
          {trade.quantityDiff > 0 ? '+' : ''}{formatNumber(trade.quantityDiff)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        ₩{formatNumber(Math.round(trade.newValue))}
      </td>
      <td className="px-4 py-3 text-right">
        {trade.newWeight.toFixed(1)}%
      </td>
      <td className="px-4 py-3">
        <button
          onClick={() => onRemoveETF(index)}
          className="text-red-500 hover:text-red-700"
        >
          삭제
        </button>
      </td>
    </tr>
  );
});

// TableComponent의 Props 타입 정의
interface TableComponentProps {
  trades: Trade[];
  etfList: ETF[];
  setEtfList: (etfs: ETF[]) => void;
  targetRatios: number[];
  setTargetRatios: (ratios: number[]) => void;
  onRemoveETF: (index: number) => void;
  onTickerChange: (index: number, value: string) => void;
  onTickerBlur: (index: number, value: string) => void;
}

// 테이블 컴포넌트를 별도로 분리
const TableComponent = memo(function TableComponent({ 
  trades, 
  etfList, 
  setEtfList, 
  targetRatios, 
  setTargetRatios, 
  onRemoveETF, 
  onTickerChange, 
  onTickerBlur 
}: TableComponentProps) {
  // trades 배열이 변경될 때만 리렌더링
  const memoizedTrades = useMemo(() => trades, [trades]);

  return (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left">티커</th>
            <th className="px-4 py-3 text-right">수량</th>
            <th className="px-4 py-3 text-right">현재가</th>
            <th className="px-4 py-3 text-right">평가금액</th>
            <th className="px-4 py-3 text-right">현재비중</th>
            <th className="px-4 py-3 text-right">목표비중</th>
            <th className="px-4 py-3 text-right">조정수량</th>
            <th className="px-4 py-3 text-right">조정후금액</th>
            <th className="px-4 py-3 text-right">조정후비중</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {memoizedTrades.map((trade, index) => (
            <ETFRow
              key={`${trade.ticker}-${index}`}
              trade={trade}
              index={index}
              etfList={etfList}
              setEtfList={setEtfList}
              TARGET_RATIOS={targetRatios}
              setTargetRatios={setTargetRatios}
              parseFormattedNumber={parseFormattedNumber}
              onRemoveETF={onRemoveETF}
              onTickerChange={onTickerChange}
              onTickerBlur={onTickerBlur}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}, (prevProps, nextProps) => {
  // trades 배열의 길이가 같고 내용이 같으면 리렌더링하지 않음
  return (
    prevProps.trades.length === nextProps.trades.length &&
    prevProps.trades.every((trade, index) => 
      trade.ticker === nextProps.trades[index].ticker &&
      trade.currentQuantity === nextProps.trades[index].currentQuantity
    )
  );
});

// 로딩 컴포넌트 추가
const LoadingComponent = () => (
  <div className="max-w-7xl mx-auto p-4" role="alert">
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// 포트폴리오 헤더 컴포넌트 추가
const PortfolioHeader = ({ onReset }: { onReset: () => void }) => (
  <header className="flex justify-between items-center mb-6">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 border-b pb-4">
      ETF 포트폴리오 리밸런싱
    </h2>
    <button
      onClick={onReset}
      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
    >
      설정 초기화
    </button>
  </header>
);

// 포트폴리오 컨트롤 컴포넌트 추가
const PortfolioControls = ({ 
  onAddETF, 
  totalRatio 
}: { 
  onAddETF: () => void;
  totalRatio: number;
}) => (
  <div className="mb-4 flex justify-between items-center">
    <button
      onClick={onAddETF}
      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
    >
      ETF 추가
    </button>
    <div className={`text-sm ${totalRatio === 100 ? 'text-green-600' : 'text-red-600'}`}>
      총 목표 비중: {totalRatio}%
    </div>
  </div>
);

export default function Portfolio({ initialPortfolio }: Props) {
  usePerformance('Portfolio');
  
  // 모든 state를 최상단에 선언
  const [initialized, setInitialized] = useState(false);
  const [etfList, setEtfList] = useState<ETF[]>(initialPortfolio);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [useAdditionalCash, setUseAdditionalCash] = useState<boolean>(false);
  const [additionalCashType, setAdditionalCashType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [additionalCashPercent, setAdditionalCashPercent] = useState<number>(5);
  const [additionalCashFixed, setAdditionalCashFixed] = useState<number>(0);
  const [targetRatios, setTargetRatios] = useState<number[]>(new Array(initialPortfolio.length).fill(0));

  // 핸들러 함수들을 state 선언 다음에 배치
  const handleReset = useCallback(() => {
    if (window.confirm('모든 설정을 초기화하시겠습니까?')) {
      clearStorage();
      setEtfList(initialPortfolio);
      setCashBalance(0);
      setUseAdditionalCash(false);
      setAdditionalCashType('none');
      setAdditionalCashPercent(5);
      setAdditionalCashFixed(0);
      setTargetRatios(new Array(initialPortfolio.length).fill(0));
    }
  }, [initialPortfolio]);

  const addETF = useCallback(() => {
    setEtfList(prev => [...prev, { ticker: '', quantity: 0 }]);
    setTargetRatios(prev => [...prev, 0]);
  }, []);

  const removeETF = useCallback((index: number) => {
    setEtfList(prev => prev.filter((_, i) => i !== index));
    setTargetRatios(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleTickerChange = useCallback((index: number, value: string) => {
    setEtfList(prev => {
      if (prev[index].ticker === value) return prev;
      const newList = [...prev];
      newList[index] = { ...newList[index], ticker: value.toUpperCase() };
      return newList;
    });
  }, []);

  const handleTickerBlur = useCallback((index: number, value: string) => {
    setEtfList(prev => {
      if (prev[index].ticker === value) return prev;
      const newList = [...prev];
      newList[index] = { ...newList[index], ticker: value.toUpperCase() };
      return newList;
    });
  }, []);

  // 디바운스된 저장 함수
  const debouncedSave = useMemo(() => {
    return debounce(() => {
      if (!initialized) return;
      
      saveToStorage({
        etfList,
        cashBalance,
        useAdditionalCash,
        additionalCashType,
        additionalCashPercent,
        additionalCashFixed,
        targetRatios
      });
    }, 1000);
  }, [initialized, etfList, cashBalance, useAdditionalCash, additionalCashType, additionalCashPercent, additionalCashFixed, targetRatios]);

  // 초기화 효과
  useEffect(() => {
    try {
      const savedData = loadFromStorage();
      if (savedData) {
        setEtfList(savedData.etfList || initialPortfolio);
        setCashBalance(savedData.cashBalance || 0);
        setUseAdditionalCash(savedData.useAdditionalCash || false);
        setAdditionalCashType(savedData.additionalCashType || 'none');
        setAdditionalCashPercent(savedData.additionalCashPercent || 5);
        setAdditionalCashFixed(savedData.additionalCashFixed || 0);
        setTargetRatios(savedData.targetRatios || new Array(initialPortfolio.length).fill(0));
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
    setInitialized(true);
  }, [initialPortfolio]);

  // 티커 목록 메모이제이션
  const tickers = useMemo(() => 
    etfList.map(etf => etf.ticker).filter(Boolean).join(','),
    [etfList]
  );

  // SWR로 데이터 페칭
  const { prices, isLoading: isPricesLoading } = useETFPrices(tickers);
  const { rate: exchangeRate, isLoading: isRateLoading } = useExchangeRate();

  // 초기 데이터 계산
  const defaultResults = useMemo(() => ({
    trades: etfList.map(etf => ({
      ticker: etf.ticker,
      currentQuantity: etf.quantity,
      newQuantity: etf.quantity,
      quantityDiff: 0,
      currentValue: 0,
      newValue: 0,
      currentWeight: 0,
      newWeight: 0,
      targetWeight: 0,
      price: 0
    })),
    totalAssetValue: 0,
    totalAssetValueKRW: 0,
    additionalCashNeeded: 0,
    remainingCash: cashBalance,
    maxWeightDiff: 0,
    totalWeightDiff: 0,
    needsRebalancing: false
  }), [etfList, cashBalance]);

  // 결과 계산 로직 수정
  const results = useMemo(() => {
    if (!initialized || !prices || !exchangeRate) {
      return defaultResults;
    }

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
  }, [
    initialized,
    prices,
    exchangeRate,
    etfList,
    cashBalance,
    useAdditionalCash,
    additionalCashType,
    additionalCashPercent,
    additionalCashFixed,
    targetRatios,
    defaultResults
  ]);

  // 목표 비중 합계 계산
  const totalRatio = useMemo(() => 
    targetRatios.reduce((sum, ratio) => sum + ratio, 0),
    [targetRatios]
  );

  // 초기 로딩 시에만 로딩 컴포넌트 표시
  if (!initialized) {
    return <LoadingComponent />;
  }

  return (
    <article className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg">
      <PortfolioHeader onReset={handleReset} />
      <PortfolioControls onAddETF={addETF} totalRatio={totalRatio} />

      <TableComponent
        trades={results.trades}
        etfList={etfList}
        setEtfList={setEtfList}
        targetRatios={targetRatios}
        setTargetRatios={setTargetRatios}
        onRemoveETF={removeETF}
        onTickerChange={handleTickerChange}
        onTickerBlur={handleTickerBlur}
      />
      
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

// debounce 유틸리티 함수 추가
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
) {
  let timeout: NodeJS.Timeout | null = null;

  const debouncedFunc = (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };

  debouncedFunc.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
    }
  };

  return debouncedFunc;
} 