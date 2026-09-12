import { APIError, getPayload } from 'payload'
import config from '@payload-config'
import { after } from 'next/server'
import { receiveWebmention } from '@/webmentions/receive'
export const maxDuration = 60

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))
    return new Response('Use a form-encoded source and target.', { status: 415 })
  const reader = request.body?.getReader()
  let body = ''
  let size = 0
  if (reader) {
    const decoder = new TextDecoder()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 8192) {
        await reader.cancel()
        return new Response('Submission too large.', { status: 413 })
      }
      body += decoder.decode(value, { stream: true })
    }
    body += decoder.decode()
  }
  const form = new URLSearchParams(body)
  const payload = await getPayload({ config })
  try {
    await receiveWebmention(
      payload,
      form.get('source') || '',
      form.get('target') || '',
      request.headers.get('x-vercel-forwarded-for') || 'unknown',
    )
    after(async () => {
      await payload.jobs.run({ limit: 3 })
    })
    return new Response('Accepted for verification and moderation.', { status: 202 })
  } catch (error) {
    if (error instanceof APIError && [400, 429].includes(error.status))
      return new Response(error.message, { status: error.status })
    payload.logger.error({ err: error }, 'Could not accept Webmention.')
    return new Response('Could not accept Webmention. Please try again later.', { status: 500 })
  }
}
