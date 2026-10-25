import { revalidateTag } from 'next/cache'
import { CMS_TAG } from '../../../lib/content/glokki'
import { secretFromHeaders, secretMatches } from '../../../lib/secret'

/**
 * Webhook for the CMS: refreshes everything fetched with the `cms` tag. Without a configured
 * `REVALIDATE_SECRET` every request is rejected.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET
  if (
    !expected ||
    !secretMatches(secretFromHeaders(request.headers, 'x-revalidate-secret'), expected)
  ) {
    return Response.json({ revalidated: false }, { status: 401 })
  }
  revalidateTag(CMS_TAG, 'max')
  return Response.json({ revalidated: true })
}
