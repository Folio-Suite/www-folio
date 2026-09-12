import type { NextRequest } from 'next/server'
import { cookies, draftMode } from 'next/headers'

export async function GET(req: NextRequest): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  const secure = req.nextUrl.protocol === 'https:'
  ;(await cookies()).set('folio-preview', '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure,
    sameSite: secure ? 'none' : 'lax',
    partitioned: secure,
  })
  return new Response('Draft mode is disabled')
}
