/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://etf-rebalancing.vercel.app', // 실제 도메인으로 변경 필요
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
} 