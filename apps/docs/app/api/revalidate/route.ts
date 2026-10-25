import { timingSafeEqual } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { CMS_TAG } from '../../../lib/content/glokki'

function secretFrom(request: Request) {
  const bearer = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1]
  return bearer ?? request.headers.get('x-revalidate-secret') ?? ''
}

function matches(given: string, expected: string) {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Webhook for the CMS: refreshes everything fetched with the `cms` tag. Without a configured
 * `REVALIDATE_SECRET` every request is rejected.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET
  if (!expected || !matches(secretFrom(request), expected)) {
    return Response.json({ revalidated: false }, { status: 401 })
  }
  revalidateTag(CMS_TAG, 'max')
  return Response.json({ revalidated: true })
}
