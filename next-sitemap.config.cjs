// next-sitemap loads this configuration as CommonJS.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { normalizeSiteURL } = require('./src/utilities/normalizeSiteURL.mjs')
const SITE_URL = normalizeSiteURL(
  process.env.NEXT_PUBLIC_SERVER_URL ||
    (process.env.VERCEL_ENV === 'production' ? 'https://foliosuite.app' : undefined) ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    'https://foliosuite.app',
)

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: SITE_URL,
  generateRobotsTxt: true,
  exclude: ['/blog-sitemap.xml', '/pages-sitemap.xml', '/*', '/blog/*'],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        disallow: '/admin/*',
      },
    ],
    additionalSitemaps: [`${SITE_URL}/pages-sitemap.xml`, `${SITE_URL}/blog-sitemap.xml`],
  },
}
