import { PayloadRedirects } from '@/components/PayloadRedirects'

const encodedSegment = (segment: string) => {
  try {
    return encodeURIComponent(decodeURIComponent(segment))
  } catch {
    return encodeURIComponent(segment)
  }
}

export default async function RedirectSource({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  return <PayloadRedirects url={`/${path.map(encodedSegment).join('/')}`} />
}
