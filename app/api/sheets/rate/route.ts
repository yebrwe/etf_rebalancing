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
    // URL에서 from과 to 파라미터 추출
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from')?.toUpperCase() || 'USD';
    const to = searchParams.get('to')?.toUpperCase() || 'KRW';

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 먼저 기존 데이터를 지우고 새로운 데이터를 쓰기
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Exchange!A2:B2',
    });

    // 환율 정보와 GOOGLEFINANCE 함수를 포함한 데이터 준비
    const values = [
      [`${from}/${to}`, `=GOOGLEFINANCE("CURRENCY:${from}${to}")`],
    ];

    // 데이터 쓰기
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Exchange!A2:B2',
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
      range: 'Exchange!A2:B2',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });

    const rate = response.data.values?.[0]?.[1];
    
    if (!rate || isNaN(Number(rate))) {
      throw new Error('Invalid exchange rate value');
    }

    return NextResponse.json({
      from,
      to,
      rate: parseFloat(String(rate)),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch exchange rate',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 