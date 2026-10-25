import { createAssetProxy } from '@glokki-cms/sdk/asset-proxy'

// Reads CMS_BASE_URL, CMS_TENANT and CMS_API_KEY per request, so `next build` needs no env.
const handler = createAssetProxy()

export const GET = handler
export const HEAD = handler
