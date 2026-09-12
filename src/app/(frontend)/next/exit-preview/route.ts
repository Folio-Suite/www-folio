import { cookies, draftMode } from 'next/headers'

export async function GET(): Promise<Response> {
  const draft = await draftMode()
  draft.disable()
  ;(await cookies()).delete('folio-preview')
  return new Response('Draft mode is disabled')
}
