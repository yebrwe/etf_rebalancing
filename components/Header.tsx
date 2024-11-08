'use client';

import { useState } from 'react';
import MobileMenu from './MobileMenu';

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900">
              ETF 리밸런싱 계산기
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden sm:block">
              <div className="flex space-x-4">
                <a href="#calculator" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  계산기
                </a>
                <a href="#guide" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  사용가이드
                </a>
                <a href="#faq" className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">
                  자주묻는질문
                </a>
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="sm:hidden p-2 rounded-lg hover:bg-gray-100"
              aria-label="모바일 메뉴 열기"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
      </nav>
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
} 