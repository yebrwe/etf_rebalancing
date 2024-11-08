import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  throw new Error('Required environment variables are not set');
}

export async function GET(request: Request) {
  try {
    // URL에서 tickers 파라미터 추출
    const { searchParams } = new URL(request.url);
    const tickers = searchParams.get('tickers');

    if (!tickers) {
      return NextResponse.json(
        { error: 'No tickers provided' },
        { status: 400 }
      );
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 데이터를 쓸 범위 계산
    const range = `Prices!A2:C${tickerList.length + 1}`;

    // 먼저 기존 데이터를 지우기
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    // ETF 정보와 GOOGLEFINANCE 함수를 포함한 데이터 준비
    const values = tickerList.map(ticker => [
      ticker,
      `=GOOGLEFINANCE("${ticker}", "price")`,
      'USD'
    ]);

    // 데이터 쓰기
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    // 잠시 대기 (GOOGLEFINANCE 함수가 실행될 시간 필요)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 업데이트된 값 읽기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rows = response.data.values || [];
    
    const prices: Record<string, any> = {};
    rows.forEach((row) => {
      if (row.length >= 2) {
        const [ticker, price] = row;
        if (ticker && !isNaN(Number(price))) {
          prices[ticker] = {
            price: parseFloat(String(price)),
            currency: 'USD',
            timestamp: new Date().toISOString(),
          };
        }
      }
    });

    // 모든 요청된 티커에 대해 결과가 있는지 확인
    const missingTickers = tickerList.filter(ticker => !prices[ticker]);
    if (missingTickers.length > 0) {
      console.warn('Missing prices for tickers:', missingTickers);
    }

    return NextResponse.json({
      prices,
      timestamp: new Date().toISOString(),
      status: 'success',
    });
  } catch (error) {
    console.error('Failed to fetch prices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch prices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 