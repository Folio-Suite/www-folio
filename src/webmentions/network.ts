import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'
import { Agent, fetch } from 'undici'

export const publicURL = (value: string): URL => {
  const url = new URL(value)
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !['80', '443'].includes(url.port)) ||
    host === 'localhost' ||
    /\.(localhost|local|internal)$/.test(host)
  )
    throw new Error('Use a public HTTP or HTTPS URL.')
  if (isIP(host) && ipaddr.process(host).range() !== 'unicast')
    throw new Error('Private or reserved addresses are not allowed.')
  url.hash = ''
  return url
}

export async function fetchPublicURL(value: string, options: { body?: string } = {}) {
  let url = publicURL(value)
  let body = options.body
  const deadline = Date.now() + 8000
  for (let redirects = 0; redirects <= 3; redirects++) {
    const host = url.hostname.replace(/^\[|\]$/g, '')
    let timer: ReturnType<typeof setTimeout> | undefined
    const addresses = await Promise.race([
      lookup(host, { all: true, verbatim: true }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('DNS lookup timed out.')),
          Math.max(1, deadline - Date.now()),
        )
      }),
    ]).finally(() => clearTimeout(timer))
    if (
      !addresses.length ||
      addresses.some(({ address }) => ipaddr.process(address).range() !== 'unicast')
    )
      throw new Error('Private or reserved addresses are not allowed.')
    const address = addresses[0]
    // Pin the validated address so a second DNS lookup cannot rebind to a private IP.
    const agent = new Agent({
      autoSelectFamily: false,
      connect: {
        lookup: (_host, _options, callback) => callback(null, address.address, address.family),
      },
    })
    try {
      const response = await fetch(url, {
        dispatcher: agent,
        redirect: 'manual',
        signal: AbortSignal.timeout(Math.max(1, deadline - Date.now())),
        method: body === undefined ? 'GET' : 'POST',
        body,
        headers: {
          'User-Agent': 'Folio Suite Webmention/1.0',
          ...(body === undefined
            ? { Accept: 'text/html, application/xhtml+xml' }
            : { 'Content-Type': 'application/x-www-form-urlencoded' }),
        },
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel()
        const location = response.headers.get('location')
        if (!location || redirects === 3)
          throw new Error('Too many redirects or a missing redirect destination.')
        url = publicURL(new URL(location, url).href)
        if ([301, 302, 303].includes(response.status)) body = undefined
        continue
      }
      const chunks: Uint8Array[] = []
      let length = 0
      if (response.body)
        for await (const chunk of response.body) {
          length += chunk.byteLength
          if (length > 1024 * 1024) throw new Error('Remote response exceeds 1 MiB.')
          chunks.push(chunk)
        }
      return {
        url: url.href,
        status: response.status,
        headers: response.headers,
        text: Buffer.concat(chunks).toString('utf8'),
      }
    } finally {
      await agent.destroy()
    }
  }
  throw new Error('Redirect limit exceeded.')
}
