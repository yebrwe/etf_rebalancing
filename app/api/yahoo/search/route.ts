import { NextResponse } from 'next/server';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`
    );

    if (!response.ok) {
      throw new Error('Yahoo Finance API request failed');
    }

    const data = await response.json();
    
    // ETF와 주식만 필터링
    const filteredResults: SearchResult[] = data.quotes
      .filter((quote: any) => 
        quote.quoteType === 'ETF' || quote.quoteType === 'EQUITY'
      )
      .map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        type: quote.quoteType,
        exchange: quote.exchange
      }));

    return NextResponse.json({ results: filteredResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to fetch search results' }, { status: 500 });
  }
} 