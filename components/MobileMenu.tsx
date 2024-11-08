import React, { useEffect } from 'react';
import { useAccessibilityTrap } from '@/hooks/useAccessibility';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: Props) {
  const containerRef = useAccessibilityTrap(isOpen);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="메인 메뉴"
    >
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
        role="button"
        tabIndex={-1}
        aria-label="메뉴 닫기"
      />
      <div className="absolute right-0 h-full w-64 bg-white shadow-xl">
        <div className="p-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-lg font-semibold text-gray-900" id="mobile-menu-title">메뉴</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
              aria-label="메뉴 닫기"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav aria-labelledby="mobile-menu-title">
            <a
              href="#calculator"
              onClick={onClose}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              계산기
            </a>
            <a
              href="#guide"
              onClick={onClose}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              사용가이드
            </a>
            <a
              href="#faq"
              onClick={onClose}
              className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              자주묻는질문
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
} 