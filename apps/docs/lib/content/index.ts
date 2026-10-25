import { cache } from 'react'
import { createFixtureSource } from './fixtures'
import { createGlokkiSource } from './glokki'
import type { ContentSource } from './types'

export type {
  ComponentNode,
  ContentSource,
  DeliveryPage,
  DeliveryPageListItem,
  Navigation,
  NavigationGroup,
  NavigationItem,
} from './types'

type Env = Record<string, string | undefined>

/**
 * glökki when `CMS_BASE_URL` is set (then `CMS_TENANT` and `CMS_API_KEY` are required), JSON
 * fixtures from `content/` otherwise. `preview` reads drafts from glökki, uncached (fixtures have no
 * drafts and ignore it). `cache` shares the source between the calls of one render, which is why
 * the arguments are primitives or the one `process.env` object.
 */
export const getContentSource = cache((env: Env = process.env, preview = false): ContentSource => {
  const baseUrl = env.CMS_BASE_URL
  if (!baseUrl) return createFixtureSource()

  const { CMS_TENANT: tenant, CMS_API_KEY: apiKey } = env
  if (!tenant || !apiKey) {
    const missing = [!tenant && 'CMS_TENANT', !apiKey && 'CMS_API_KEY'].filter(Boolean)
    throw new Error(`CMS_BASE_URL is set, but ${missing.join(' and ')} is missing`)
  }
  return createGlokkiSource({ baseUrl, tenant, apiKey, preview })
})
