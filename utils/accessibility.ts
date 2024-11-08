// 색상 대비 검사
export const hasGoodContrast = (foreground: string, background: string): boolean => {
  // 색상을 RGB로 변환
  const getRGB = (color: string) => {
    const hex = color.replace('#', '');
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16)
    };
  };

  // 상대 휘도 계산
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(val => 
      val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    );
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const color1 = getRGB(foreground);
  const color2 = getRGB(background);

  const l1 = getLuminance(color1.r, color1.g, color1.b);
  const l2 = getLuminance(color2.r, color2.g, color2.b);

  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return ratio >= 4.5; // WCAG AA 기준
};

// 스크린리더 친화적인 텍스트 생성
export const getAriaLabel = (value: number, type: 'currency' | 'percent' | 'number'): string => {
  switch (type) {
    case 'currency':
      return `${value.toLocaleString()}원`;
    case 'percent':
      return `${value.toFixed(2)}퍼센트`;
    case 'number':
      return value.toLocaleString();
    default:
      return value.toString();
  }
};

// 키보드 네비게이션 헬퍼
export const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
  const elements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements) as HTMLElement[];
};

// ARIA 라이브 리전 업데이트
export const updateLiveRegion = (message: string, type: 'polite' | 'assertive' = 'polite') => {
  const liveRegion = document.createElement('div');
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', type);
  liveRegion.className = 'sr-only';
  document.body.appendChild(liveRegion);

  // 메시지 설정 및 제거
  setTimeout(() => {
    liveRegion.textContent = message;
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 3000);
  }, 100);
}; 