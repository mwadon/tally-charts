import { createAssetProxy } from '@glokki-cms/sdk/asset-proxy'

// Reads CMS_BASE_URL, CMS_TENANT and CMS_API_KEY per request, so `next build` needs no env.
const proxy = createAssetProxy()

interface Context {
  params: Promise<{ path: string[] }>
}

/**
 * `.` or `..`, also when it is still percent-encoded: the proxy pastes the segments into the
 * upstream URL, where `fetch` would resolve them and reach other endpoints with the API key.
 * A segment that does not decode is refused as well.
 */
function isDotSegment(segment: string) {
  let decoded: string
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    return true
  }
  return [segment, decoded].some((s) => s === '.' || s === '..')
}

/** Assets of the CMS under the site's own origin. Without a CMS (the fixtures) there are none. */
async function handler(request: Request, ctx: Context): Promise<Response> {
  if (!process.env.CMS_BASE_URL) return new Response('Not found', { status: 404 })
  const { path } = await ctx.params
  if (path.some(isDotSegment)) return new Response('Bad request', { status: 400 })
  return proxy(request, ctx)
}

export const GET = handler
export const HEAD = handler
