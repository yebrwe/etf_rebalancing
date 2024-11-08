import { NextResponse } from 'next/server';

interface YahooQuote {
  regularMarketPrice: number;
  currency: string;
  symbol: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tickers = searchParams.get('tickers');

    if (!tickers) {
      return NextResponse.json({ error: 'No tickers provided' }, { status: 400 });
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
    const prices: Record<string, any> = {};

    // Yahoo Finance API 호출
    await Promise.all(
      tickerList.map(async (ticker) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
          );
          
          if (!response.ok) {
            console.error(`Failed to fetch ${ticker}: ${response.statusText}`);
            return;
          }

          const data = await response.json();
          const quote = data?.chart?.result?.[0]?.meta as YahooQuote;
          
          if (quote?.regularMarketPrice) {
            prices[ticker] = {
              price: quote.regularMarketPrice,
              currency: 'USD',
              timestamp: new Date().toISOString(),
            };
          }
        } catch (error) {
          console.error(`Error fetching ${ticker}:`, error);
        }
      })
    );

    // 결과 검증
    const missingTickers = tickerList.filter(ticker => !prices[ticker]);
    if (missingTickers.length > 0) {
      console.warn('Missing prices for tickers:', missingTickers);
    }

    return NextResponse.json({
      prices,
      timestamp: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prices' },
      { status: 500 }
    );
  }
} 