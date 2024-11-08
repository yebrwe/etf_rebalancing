export const testScreenReaderContent = () => {
  const results = {
    headings: [] as string[],
    landmarks: [] as string[],
    liveRegions: [] as string[],
    images: [] as string[],
    buttons: [] as string[],
    links: [] as string[],
  };

  // 헤딩 테스트
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
    results.headings.push(`${heading.tagName}: ${heading.textContent}`);
  });

  // 랜드마크 테스트
  document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"]').forEach((landmark) => {
    results.landmarks.push(`${landmark.getAttribute('role')}`);
  });

  // 라이브 리전 테스트
  document.querySelectorAll('[aria-live]').forEach((region) => {
    results.liveRegions.push(`${region.getAttribute('aria-live')}: ${region.textContent}`);
  });

  // 이미지 테스트
  document.querySelectorAll('img').forEach((img) => {
    results.images.push(`alt: ${img.alt || 'missing'}`);
  });

  // 버튼 테스트
  document.querySelectorAll('button, [role="button"]').forEach((button) => {
    results.buttons.push(
      button.getAttribute('aria-label') || 
      button.textContent || 
      'missing label'
    );
  });

  // 링크 테스트
  document.querySelectorAll('a').forEach((link) => {
    results.links.push(
      link.getAttribute('aria-label') || 
      link.textContent || 
      'missing label'
    );
  });

  return results;
};

export const validateAccessibility = () => {
  const issues = [];

  // 색상 대비 검사
  document.querySelectorAll('*').forEach((element) => {
    const style = window.getComputedStyle(element);
    const backgroundColor = style.backgroundColor;
    const color = style.color;
    
    if (backgroundColor !== 'transparent' && color !== 'transparent') {
      const contrast = getColorContrast(backgroundColor, color);
      if (contrast < 4.5) {
        issues.push(`Low contrast (${contrast.toFixed(2)}) for element: ${element.tagName}`);
      }
    }
  });

  // 이미지 대체 텍스트 검사
  document.querySelectorAll('img').forEach((img) => {
    if (!img.alt && !img.getAttribute('role') === 'presentation') {
      issues.push(`Missing alt text: ${img.src}`);
    }
  });

  // 폼 레이블 검사
  document.querySelectorAll('input, select, textarea').forEach((input) => {
    const hasLabel = input.id && document.querySelector(`label[for="${input.id}"]`);
    const hasAriaLabel = input.getAttribute('aria-label');
    const hasAriaLabelledBy = input.getAttribute('aria-labelledby');

    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push(`Missing label: ${input.tagName}${input.id ? `#${input.id}` : ''}`);
    }
  });

  return issues;
};

// 색상 대비 계산 헬퍼 함수
const getColorContrast = (background: string, foreground: string): number => {
  const getBrightness = (color: string) => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    return (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
  };

  const bg = getBrightness(background);
  const fg = getBrightness(foreground);

  return Math.abs(bg - fg);
}; 