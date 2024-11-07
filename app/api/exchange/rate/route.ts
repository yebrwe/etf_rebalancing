import { NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';

export async function GET() {
  try {
    // 네이버 금융 환율 페이지에서 데이터 가져오기
    const response = await axios.get('https://finance.naver.com/marketindex/exchangeDetail.naver?marketindexCd=FX_USDKRW');
    const dom = new JSDOM(response.data);
    const document = dom.window.document;
    
    // 현재 환율 추출 (콤마 제거 후 숫자로 변환)
    const rateText = document.querySelector('#content > div.section_calculator > table:nth-child(4) > tbody > tr > td:nth-child(1)')?.textContent || '0';
    const rate = parseFloat(rateText.replace(/,/g, ''));

    if (isNaN(rate)) {
      throw new Error('Failed to parse exchange rate');
    }

    return NextResponse.json({
      rate,
      timestamp: new Date().toISOString(),
      source: 'Naver Finance'
    });
  } catch (error) {
    console.error('환율 조회 실패:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch exchange rate',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 