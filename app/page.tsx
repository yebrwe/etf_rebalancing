'use client';

import { useState, useEffect, useCallback } from 'react';
import Portfolio from '@/components/Portfolio';
import { ETF } from '@/types/portfolio';

interface PriceResponse {
  prices: Record<string, {
    price: number;
    currency: string;
    timestamp: string;
    exchange: string;
  }>;
  timestamp: string;
  status: string;
}

export default function Home() {
  const [currentPrices, setCurrentPrices] = useState<PriceResponse | undefined>();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // 초기 ETF 목록
  const initialPortfolio: ETF[] = [
    { ticker: 'SCHD', quantity: 0, targetWeight: 80 },
    { ticker: 'QQQ', quantity: 0, targetWeight: 15 },
    { ticker: 'TQQQ', quantity: 0, targetWeight: 5 }
  ];

  const fetchPrices = useCallback(async () => {
    if (!isInitialLoad) return;

    try {
      const symbols = initialPortfolio.map(item => item.ticker);
      const response = await fetch(`/api/etf/price?symbols=${symbols.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch prices');
      
      const data = await response.json();
      setCurrentPrices(data);
      setIsInitialLoad(false);
    } catch (err) {
      console.error(err);
    }
  }, [isInitialLoad, initialPortfolio]);

  useEffect(() => {
    fetchPrices();
    const intervalId = setInterval(() => {
      setIsInitialLoad(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [fetchPrices]);

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ETF 포트폴리오 리밸런싱 계산기
          </h1>
          {currentPrices && (
            <p className="text-sm text-gray-500 mt-2">
              마지막 업데이트: {new Date(currentPrices.timestamp).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
        <Portfolio 
          initialPortfolio={initialPortfolio}
          currentPrices={currentPrices}
        />
      </div>
    </main>
  );
}
