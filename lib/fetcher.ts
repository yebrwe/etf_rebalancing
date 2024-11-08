export const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('API 요청 실패');
  }
  return res.json();
};

// 캐시 키 생성 함수
export const generateCacheKey = (tickers: string) => 
  `price_${tickers}_${new Date().toISOString().split('T')[0]}`;

// 환율 캐시 키
export const EXCHANGE_RATE_CACHE_KEY = 'exchange_rate'; 