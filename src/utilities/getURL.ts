import canUseDOM from './canUseDOM'
import { normalizeSiteURL } from './normalizeSiteURL.mjs'

export const getServerSideURL = () => {
  return normalizeSiteURL(
    process.env.NEXT_PUBLIC_SERVER_URL ||
      (process.env.VERCEL_ENV === 'production' ? 'https://foliosuite.app' : undefined) ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'http://localhost:3000',
  )
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  return getServerSideURL()
}
