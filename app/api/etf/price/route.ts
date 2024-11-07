import { NextResponse } from 'next/server';
import axios from 'axios';
import { getStoredToken, storeToken } from '@/lib/tokenCache';

const API_KEY = process.env.KOREA_INVESTMENT_APP_KEY;
const API_SECRET = process.env.KOREA_INVESTMENT_APP_SECRET;
const BASE_URL = 'https://openapi.koreainvestment.com:9443';

// ETF별 거래소 매핑 수정
const EXCHANGE_MAP: Record<string, string> = {
  'SCHD': 'AMS',   // NYSEARCA (Arca Exchange)
  'QQQ': 'NAS',    // NASDAQ
  'TQQQ': 'NAS',   // NASDAQ
};

async function getAccessToken() {
  try {
    const cachedToken = getStoredToken();
    if (cachedToken) {
      return cachedToken;
    }

    const response = await axios.post(`${BASE_URL}/oauth2/tokenP`, {
      grant_type: 'client_credentials',
      appkey: API_KEY,
      appsecret: API_SECRET
    });

    const newToken = response.data.access_token;
    storeToken(newToken);
    return newToken;
  } catch (error) {
    console.error('토큰 발급 실패:', error);
    throw error;
  }
}

async function getETFPrice(symbol: string, token: string) {
  const exchange = EXCHANGE_MAP[symbol];
  if (!exchange) {
    console.error(`Unknown exchange for symbol: ${symbol}`);
    return null;
  }

  try {
    console.log(`Fetching price for ${symbol} from exchange ${exchange}`); // 디버깅용 로그 추가
    const response = await axios.get(`${BASE_URL}/uapi/overseas-price/v1/quotations/price`, {
      headers: {
        'Content-Type': 'application/json',
        'authorization': `Bearer ${token}`,
        'appkey': API_KEY,
        'appsecret': API_SECRET,
        'tr_id': 'HHDFS00000300'
      },
      params: {
        AUTH: '',
        EXCD: exchange,
        SYMB: symbol,
        GUBN: '0',
        BYMD: '',
        MODP: '1'
      }
    });
    
    console.log(`Response for ${symbol}:`, response.data); // 디버깅용 로그 추가
    
    if (response.data?.output?.last) {
      return {
        price: parseFloat(response.data.output.last),
        currency: 'USD',
        timestamp: new Date().toISOString(),
        exchange: exchange
      };
    }
    throw new Error(`Invalid price data for ${symbol}`);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Token expired');
    }
    console.error(`${symbol} 가격 조회 실패:`, {
      status: error.response?.status,
      message: error.response?.data?.msg1 || error.message,
      details: error.response?.data,
      exchange: exchange
    });
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get('symbols')?.split(',');

  if (!symbols) {
    return NextResponse.json({ error: 'No symbols provided' }, { status: 400 });
  }

  try {
    let token = await getAccessToken();
    let prices: Record<string, any> = {};

    for (const symbol of symbols) {
      if (!EXCHANGE_MAP[symbol]) {
        console.error(`Unsupported symbol: ${symbol}`);
        continue;
      }

      try {
        const result = await getETFPrice(symbol, token);
        if (!result && token) {
          token = await getAccessToken();
          prices[symbol] = await getETFPrice(symbol, token);
        } else {
          prices[symbol] = result;
        }
      } catch (error: any) {
        if (error.message === 'Token expired') {
          token = await getAccessToken();
          prices[symbol] = await getETFPrice(symbol, token);
        } else {
          prices[symbol] = null;
          console.error(`Failed to fetch price for ${symbol}:`, error);
        }
      }
    }

    return NextResponse.json({
      prices,
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  } catch (error) {
    console.error('API 요청 실패:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch prices',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 