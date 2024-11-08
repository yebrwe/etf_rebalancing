'use client';

import { useState, useEffect } from 'react';
import Portfolio from '@/components/Portfolio';
import { ETF } from '@/types/portfolio';

interface PriceResponse {
  prices: Record<string, {
    price: number;
    currency: string;
    timestamp: string;
  }>;
  timestamp: string;
  status: string;
}

export default function Home() {
  const [currentPrices, setCurrentPrices] = useState<PriceResponse | undefined>();

  // 초기 ETF 목록
  const initialPortfolio: ETF[] = [
    { ticker: 'SCHD', quantity: 0, targetWeight: 80 },
    { ticker: 'QQQ', quantity: 0, targetWeight: 15 },
    { ticker: 'TQQQ', quantity: 0, targetWeight: 5 }
  ];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const tickers = initialPortfolio.map(item => item.ticker).join(',');
        const response = await fetch(`/api/sheets/price?tickers=${tickers}`);
        if (!response.ok) throw new Error('Failed to fetch prices');
        
        const data = await response.json();
        setCurrentPrices(data);
      } catch (err) {
        console.error('Failed to fetch prices:', err);
      }
    };

    fetchPrices();
    
    // 5분마다 가격 업데이트
    const intervalId = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Portfolio 
          initialPortfolio={initialPortfolio}
          currentPrices={currentPrices}
        />
      </div>
    </main>
  );
}
