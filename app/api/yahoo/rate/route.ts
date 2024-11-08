import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || 'USD';
    const to = searchParams.get('to') || 'KRW';
    const pair = `${from}${to}=X`;

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${pair}?interval=1d&range=1d`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate');
    }

    const data = await response.json();
    const rate = data?.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!rate) {
      throw new Error('Exchange rate not found');
    }

    return NextResponse.json({
      rate,
      timestamp: new Date().toISOString(),
      status: 'success'
    });

  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
} 