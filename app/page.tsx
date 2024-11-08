'use client';

import Portfolio from '@/components/Portfolio';
import FAQ from '@/components/FAQ';
import Guide from '@/components/Guide';
import { ETF } from '@/types/portfolio';

const initialPortfolio: ETF[] = [
  { ticker: 'SCHD', quantity: 0 },
  { ticker: 'QQQ', quantity: 0 },
  { ticker: 'TQQQ', quantity: 0 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 메인 섹션 */}
      <section className="py-12 bg-gradient-to-b from-blue-50 to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              ETF 포트폴리오 리밸런싱 계산기
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              미국 ETF 포트폴리오의 리밸런싱을 쉽고 정확하게 계산하세요.
              실시간 가격 정보를 기반으로 최적의 매매 수량을 제안합니다.
            </p>
          </div>
        </div>
      </section>

      {/* 계산기 섹션 */}
      <section id="calculator" className="py-12">
        <Portfolio initialPortfolio={initialPortfolio} />
      </section>

      {/* 사용 가이드 섹션 */}
      <section id="guide" className="py-12 bg-white">
        <Guide />
      </section>

      {/* FAQ 섹션 */}
      <section id="faq" className="py-12 bg-gray-50">
        <FAQ />
      </section>

      {/* CTA 섹션 */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">ETF 포트폴리오를 최적화하세요</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-100">
            실시간 가격 정보를 기반으로 정확한 리밸런싱을 수행하세요.
          </p>
          <div className="mt-8">
            <a
              href="#calculator"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
            >
              지금 시작하기
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
