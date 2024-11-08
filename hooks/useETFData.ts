import useSWR from 'swr';
import { fetcher, generateCacheKey } from '@/lib/fetcher';
import { PriceData } from '@/types/portfolio';

interface PriceResponse {
  prices: Record<string, PriceData>;
  timestamp: string;
  status: string;
}

export function useETFPrices(tickers: string) {
  const { data, error, isLoading, mutate } = useSWR<PriceResponse>(
    tickers ? `/api/yahoo/price?tickers=${tickers}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 60000, // 1분마다 갱신
      dedupingInterval: 30000, // 30초 동안 중복 요청 방지
    }
  );

  return {
    prices: data?.prices,
    timestamp: data?.timestamp,
    isLoading,
    isError: error,
    mutate
  };
}

export function useExchangeRate() {
  const { data, error, isLoading } = useSWR(
    '/api/yahoo/rate?from=USD&to=KRW',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 300000, // 5분마다 갱신
      dedupingInterval: 60000, // 1분 동안 중복 요청 방지
    }
  );

  return {
    rate: data?.rate,
    isLoading,
    isError: error
  };
} 