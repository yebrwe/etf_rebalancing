import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // API 라우트에 대한 CORS 설정
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,POST' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ]
  },
  /* config options here */
  env: {
    KOREA_INVESTMENT_APP_KEY: process.env.KOREA_INVESTMENT_APP_KEY,
    KOREA_INVESTMENT_APP_SECRET: process.env.KOREA_INVESTMENT_APP_SECRET,
  },
};

export default nextConfig;
