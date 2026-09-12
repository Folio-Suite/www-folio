import { feedResponse } from '@/blog/feeds'
export const dynamic = 'force-dynamic'
export const GET = () => feedResponse('rss')
