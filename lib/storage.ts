import { ETF } from '@/types/portfolio';

interface StorageData {
  etfList: ETF[];
  cashBalance: number;
  useAdditionalCash: boolean;
  additionalCashType: 'none' | 'percent' | 'fixed';
  additionalCashPercent: number;
  additionalCashFixed: number;
  targetRatios: number[];
  lastUpdated: string;
}

const STORAGE_KEY = 'etf_portfolio_settings';

export const saveToStorage = (data: Partial<StorageData>) => {
  try {
    if (typeof window === 'undefined') return false;

    const existingData = loadFromStorage();
    const newData = {
      ...existingData,
      ...data,
      lastUpdated: new Date().toISOString()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    console.log('Settings saved:', newData);
    return true;
  } catch (error) {
    console.error('설정 저장 실패:', error);
    return false;
  }
};

export const loadFromStorage = (): StorageData | null => {
  try {
    if (typeof window === 'undefined') return null;

    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      console.log('No saved settings found');
      return null;
    }

    const parsedData = JSON.parse(data);
    console.log('Settings loaded:', parsedData);
    return parsedData;
  } catch (error) {
    console.error('설정 로드 실패:', error);
    return null;
  }
};

export const clearStorage = () => {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.removeItem(STORAGE_KEY);
    console.log('Settings cleared');
    return true;
  } catch (error) {
    console.error('설정 초기화 실패:', error);
    return false;
  }
}; 