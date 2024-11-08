import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

// 검색어와 일치하는 부분을 하이라이트하는 함수
const Highlight = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight.trim()) {
    return <span>{text}</span>;
  }

  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="bg-yellow-100 font-semibold">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export default function TickerAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = "티커 입력",
  className = ""
}: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Portal 컨테이너 생성
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.zIndex = '1000';
    document.body.appendChild(container);
    setPortalContainer(container);

    return () => {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, []);

  // 드롭다운 위치 업데이트
  useEffect(() => {
    if (!isOpen || !portalContainer || !wrapperRef.current) return;

    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (rect && portalContainer) {
        portalContainer.style.top = `${rect.bottom + window.scrollY}px`;
        portalContainer.style.left = `${rect.left + window.scrollX}px`;
        portalContainer.style.width = '400px'; // 데스크톱 너비 고정
        
        // 모바일에서는 너비 조정
        if (window.innerWidth < 768) {
          const maxWidth = Math.min(350, window.innerWidth - 32); // 32는 좌우 여백
          portalContainer.style.width = `${maxWidth}px`;
        }
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, portalContainer]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchTickers = async () => {
      if (!debouncedQuery || !isFocused) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/yahoo/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchTickers();
  }, [debouncedQuery, isFocused]);

  const handleSelect = (symbol: string) => {
    setQuery(symbol);
    onChange(symbol);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setQuery(newValue);
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setTimeout(() => {
      onChange(query);
      onBlur(e);
      setIsOpen(false);
    }, 200);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => {
          setIsFocused(true);
          if (query) setIsOpen(true);
        }}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className={`w-full border rounded p-2 ${className}`}
      />
      
      {loading && (
        <div className="absolute right-3 top-3">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}

      {isOpen && isFocused && results.length > 0 && portalContainer && typeof document !== 'undefined' && createPortal(
        <div className="bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {results.map((result, index) => (
            <button
              key={index}
              className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              onClick={() => handleSelect(result.symbol)}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  <Highlight text={result.symbol} highlight={query} />
                </span>
                <span className="text-xs text-gray-500">{result.type}</span>
              </div>
              <div className="text-sm text-gray-600 truncate">
                <Highlight text={result.name} highlight={query} />
              </div>
            </button>
          ))}
        </div>,
        portalContainer
      )}
    </div>
  );
} 