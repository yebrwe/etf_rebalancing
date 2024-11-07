import fs from 'fs';
import path from 'path';

interface TokenCache {
  token: string;
  expiresAt: number;
}

const CACHE_FILE = path.join(process.cwd(), 'token-cache.json');

export function getStoredToken(): string | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    
    const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as TokenCache;
    
    // 현재 시간이 만료 시간을 지났는지 확인
    if (Date.now() >= cache.expiresAt) {
      fs.unlinkSync(CACHE_FILE);
      return null;
    }
    
    return cache.token;
  } catch (error) {
    console.error('토큰 캐시 읽기 실패:', error);
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    // 24시간에서 5분을 뺀 시간으로 설정 (안전 마진)
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000) - (5 * 60 * 1000);
    const cache: TokenCache = { token, expiresAt };
    
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
  } catch (error) {
    console.error('토큰 캐시 저장 실패:', error);
  }
} 