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

  // 초기 ETF 목록
  const initialPortfolio: ETF[] = [
    { ticker: 'SCHD', quantity: 0, targetWeight: 80 },
    { ticker: 'QQQ', quantity: 0, targetWeight: 15 },
    { ticker: 'TQQQ', quantity: 0, targetWeight: 5 }
  ];

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Portfolio 
          initialPortfolio={initialPortfolio}
        />
      </div>
    </main>
  );
}
