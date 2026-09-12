import { cookies, headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { resolveSite } from './config'

export const getRequestSite = cache(async () => {
  const requestHeaders = await headers()
  const selected = (await cookies()).get('folio-site')?.value
  const result = resolveSite(requestHeaders.get('host'), selected)
  if (!result) notFound()
  return result
})
