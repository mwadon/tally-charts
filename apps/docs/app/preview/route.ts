import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { slugPattern } from '../../lib/content/navigation-config'
import { secretFromHeaders, secretMatches } from '../../lib/secret'
import { docHref } from '../_content/doc-href'

const unauthorized = () => Response.json({ enabled: false }, { status: 401 })

/**
 * Turns on draft mode and sends the editor to the page: `GET /preview?slug=<slug>` with the
 * `PREVIEW_SECRET` as `Authorization: Bearer`, `x-preview-secret` or `?secret=`. Without a
 * configured secret every request is 401. The target is built from a validated slug, never from a
 * URL in the request, so it cannot leave the site.
 */
export async function GET(request: Request) {
  const expected = process.env.PREVIEW_SECRET
  const { searchParams } = new URL(request.url)
  const given =
    secretFromHeaders(request.headers, 'x-preview-secret') || (searchParams.get('secret') ?? '')
  if (!expected || !secretMatches(given, expected)) return unauthorized()

  const slug = searchParams.get('slug')
  if (!slug || !slugPattern.test(slug)) {
    return Response.json({ enabled: false, error: 'Invalid slug' }, { status: 400 })
  }

  ;(await draftMode()).enable()
  redirect(slug === 'home' ? '/' : docHref(slug))
}
