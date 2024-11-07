/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    KOREA_INVESTMENT_APP_KEY: process.env.KOREA_INVESTMENT_APP_KEY,
    KOREA_INVESTMENT_APP_SECRET: process.env.KOREA_INVESTMENT_APP_SECRET,
  },
}

module.exports = nextConfig 