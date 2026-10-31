import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { Navigation } from './types'

export const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Groups, labels and order of the sidebar. glokki only lists published pages, so this lives in the repo. */
export const navigationConfigSchema = z.object({
  groups: z.array(
    z.object({
      label: z.string().min(1),
      items: z.array(z.object({ label: z.string().min(1), slug: z.string().regex(slugPattern) })),
    }),
  ),
})

export type NavigationConfig = z.infer<typeof navigationConfigSchema>

export const NAVIGATION_FILE = 'navigation.json'

export const defaultContentDir = () => path.join(process.cwd(), 'content')

/** Reads and validates `navigation.json` in `dir`; a bad file fails with its name. */
export async function loadNavigationConfig(dir = defaultContentDir()): Promise<NavigationConfig> {
  const file = path.join(/*turbopackIgnore: true*/ dir, NAVIGATION_FILE)
  let json: unknown
  try {
    json = JSON.parse(await readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`${NAVIGATION_FILE}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const parsed = navigationConfigSchema.safeParse(json)
  if (!parsed.success) throw new Error(`${NAVIGATION_FILE}: ${z.prettifyError(parsed.error)}`)
  return parsed.data
}

/** The config with `available` set from `has(slug)`. */
export function withAvailability(
  config: NavigationConfig,
  has: (slug: string) => boolean,
): Navigation {
  return {
    groups: config.groups.map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ ...item, available: has(item.slug) })),
    })),
  }
}
