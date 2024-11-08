import { useEffect, useRef } from 'react';

export const usePerformance = (componentName: string) => {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();

    return () => {
      if (startTime.current) {
        const endTime = performance.now();
        const duration = endTime - startTime.current;
        console.log(`${componentName} 렌더링 시간: ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}; 