import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AnnouncementProvider } from '@/contexts/AnnouncementContext';
import ScrollProgress from '@/components/ScrollProgress';
import ScrollToTop from '@/components/ScrollToTop';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://etf-rebalancing.com'),
  title: 'ETF 포트폴리오 리밸런싱 계산기 | 무료 ETF 자산배분 도구',
  description: '미국 ETF 포트폴리오 리밸런싱을 쉽게 계산해보세요. SCHD, QQQ, TQQQ 등 인기 ETF 실시간 가격 기반 자산배분 계산기',
  keywords: 'ETF 리밸런싱, 포트폴리오 계산기, SCHD, QQQ, TQQQ, 자산배분, 미국ETF',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://etf-rebalancing.com',
    title: 'ETF 포트폴리오 리밸런싱 계산기',
    description: '미국 ETF 포트폴리오 리밸런싱을 쉽게 계산해보세요.',
    siteName: 'ETF 리밸런싱 계산기',
    images: [{
      url: 'https://etf-rebalancing.com/og-image.png',
      width: 1200,
      height: 630,
      alt: 'ETF 리밸런싱 계산기'
    }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: 'MMVpVpkE19QLCYuUdb8nJFanMc_wocirgio_xJyqSBY',
  },
  alternates: {
    canonical: 'https://etf-rebalancing.com'
  },
  other: {
    'google-adsense-account': 'ca-pub-4111350052400529'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="scroll-smooth">
      <body className={`${inter.className} bg-gray-50`}>
        <AnnouncementProvider>
          <div className="min-h-screen text-gray-900">
            <ScrollProgress />
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <ScrollToTop />
          </div>
        </AnnouncementProvider>
      </body>
    </html>
  );
}
