import { createFixtureSource } from './fixtures'
import type { NavigationConfig } from './navigation-config'
import type { DeliveryPage } from './types'

/** A page as the CMS lists it. `slug` starts with `/`. */
export interface RemotePage {
  id: string
  slug: string
  title: string
  locale: string
  /**
   * glokki's page status. Editing a published page sets it back to `draft` (the live version
   * keeps being served), so `published` means "live and no unpublished changes".
   */
  status: string
}

export interface RemoteNode {
  id: string
  type: string
  props: Record<string, unknown>
}

/** A page with its tree. `updatedAt` is the `expectedUpdatedAt` token of the next write. */
export interface RemoteDetail extends RemotePage {
  updatedAt: string
  componentTree: RemoteNode[]
  seo: Record<string, unknown>
}

/** Every write returns the token for the next one. */
export interface Written {
  updatedAt: string
}

/** The glokki operations the seed needs; `glokki-mcp.ts` implements them, tests fake them. */
export interface SeedClient {
  listPages(): Promise<RemotePage[]>
  getPage(pageId: string): Promise<RemoteDetail>
  /** The `defaultProps` the server puts in every new block of `type` (`get_block_schema`). */
  getBlockDefaults(type: string): Promise<Record<string, unknown>>
  createPage(args: {
    title: string
    slug: string
    locale: string
    layoutKey: string
  }): Promise<Written & { id: string }>
  addBlock(args: {
    pageId: string
    expectedUpdatedAt: string
    type: string
    props: Record<string, unknown>
  }): Promise<Written>
  updateBlockProps(args: {
    pageId: string
    expectedUpdatedAt: string
    nodeId: string
    propsPatch: Record<string, unknown>
  }): Promise<Written>
  removeBlock(args: { pageId: string; expectedUpdatedAt: string; nodeId: string }): Promise<Written>
  updatePage(args: { pageId: string; expectedUpdatedAt: string; title: string }): Promise<Written>
  updateSeo(args: {
    pageId: string
    expectedUpdatedAt: string
    seo: Record<string, unknown>
  }): Promise<Written>
  /** Returns nothing the seed needs: the last write is always the publish. */
  publishPage(pageId: string): Promise<void>
}

export type SeedKind = 'create' | 'update' | 'skip'

export interface SeedAction {
  /** The slug in the CMS: `/` + the slug of the fixture (`home` is `/home`). */
  slug: string
  /** Only for a CMS page of another locale than the fixture with the same slug. */
  locale?: string
  kind: SeedKind
  /**
   * `update`: what differs (`title`, `seo`, `blocks`, `unpublished`). `skip`: why (`unchanged`,
   * `no fixture`, `not in fixtures`). Empty for `create`.
   */
  reasons: string[]
  fixture?: DeliveryPage
  remote?: RemoteDetail
  /**
   * `update` with `blocks`: the props to merge into each block, in order, or `null` when the
   * tree has to be removed and added again.
   */
  patches?: Record<string, unknown>[] | null
}

/**
 * What is already in the CMS: every page, the full page for each one that has a fixture (keyed by
 * `remoteKey`), and the `defaultProps` of the block types of the fixtures.
 */
export interface RemoteState {
  pages: RemotePage[]
  details: ReadonlyMap<string, RemoteDetail>
  defaults: ReadonlyMap<string, Record<string, unknown>>
}

export const cmsSlug = (fixtureSlug: string) => `/${fixtureSlug}`

/** A page is its slug and its locale: `search_pages` lists every locale. */
export const remoteKey = (slug: string, locale: string) => `${locale}\n${slug}`

/** The pages of `<dir>/*.json`, sorted by slug. */
export async function readFixtures(dir?: string): Promise<DeliveryPage[]> {
  const source = createFixtureSource({ dir })
  const items = await source.listPages()
  const pages = await Promise.all(items.map((item) => source.getPage(item.slug)))
  return pages.flatMap((page) => (page ? [page] : []))
}

/** Lists the CMS and reads each page that has a fixture. Read-only. */
export async function readRemote(
  client: SeedClient,
  fixtures: readonly DeliveryPage[],
): Promise<RemoteState> {
  const pages = await client.listPages()
  const wanted = new Set(
    fixtures.map((fixture) => remoteKey(cmsSlug(fixture.slug), fixture.locale)),
  )
  const details = new Map<string, RemoteDetail>()
  for (const page of pages) {
    const key = remoteKey(page.slug, page.locale)
    if (wanted.has(key)) details.set(key, await client.getPage(page.id))
  }

  const defaults = new Map<string, Record<string, unknown>>()
  for (const fixture of fixtures) {
    if (!details.has(remoteKey(cmsSlug(fixture.slug), fixture.locale))) continue
    for (const { type } of fixture.componentTree) {
      if (!defaults.has(type)) defaults.set(type, await client.getBlockDefaults(type))
    }
  }
  return { pages, details, defaults }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a)) {
    return Array.isArray(b) && a.length === b.length && a.every((item, i) => deepEqual(item, b[i]))
  }
  if (isRecord(a)) {
    if (!isRecord(b)) return false
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every((key) => deepEqual(a[key], b[key]))
  }
  return Object.is(a, b)
}

/**
 * What a block must change to hold `want` (the props of the fixture) on top of the `defaults` the
 * server adds. `patch` is the shallow merge that gets there; `rebuild` is set when `have` holds a
 * key that is neither in the fixture nor in the defaults: a merge cannot remove it.
 */
function diffProps(
  have: Record<string, unknown>,
  want: Record<string, unknown>,
  defaults: Record<string, unknown>,
) {
  const full = { ...defaults, ...want }
  const patch = Object.fromEntries(Object.entries(full).filter(([k, v]) => !deepEqual(have[k], v)))
  const rebuild = Object.keys(have).some((key) => !(key in full))
  return { patch, rebuild }
}

function assertFlat(fixture: DeliveryPage) {
  if (fixture.componentTree.some((node) => node.children?.length)) {
    throw new Error(`${fixture.slug}: nested blocks are not supported by the seed`)
  }
}

const sameTypes = (fixture: DeliveryPage, nodes: readonly RemoteNode[]) =>
  fixture.componentTree.length === nodes.length &&
  fixture.componentTree.every((node, i) => node.type === nodes[i]?.type)

/** Per block of the fixture: the patch to apply, or `null` when the tree has to be rebuilt. */
function blockPatches(
  fixture: DeliveryPage,
  nodes: readonly RemoteNode[],
  defaults: ReadonlyMap<string, Record<string, unknown>>,
): Record<string, unknown>[] | null {
  if (!sameTypes(fixture, nodes)) return null
  const patches: Record<string, unknown>[] = []
  for (const [i, node] of fixture.componentTree.entries()) {
    const { patch, rebuild } = diffProps(
      (nodes[i] as RemoteNode).props,
      node.props,
      defaults.get(node.type) ?? {},
    )
    if (rebuild) return null
    patches.push(patch)
  }
  return patches
}

/**
 * Ignoring the node ids (the server mints them): a page is in order when the title and the seo
 * match, the block types match in order, every block holds exactly the props of the fixture on
 * top of the `defaultProps` the server added, and it is published with no unpublished changes.
 * A prop or a seo field that is gone from the fixture counts as a difference; the defaults are
 * what makes a second run come out empty.
 */
function differences(
  fixture: DeliveryPage,
  remote: RemoteDetail,
  defaults: ReadonlyMap<string, Record<string, unknown>>,
): { reasons: string[]; patches: Record<string, unknown>[] | null } {
  const reasons: string[] = []
  if (fixture.title !== remote.title) reasons.push('title')
  if (!deepEqual(remote.seo, fixture.seo)) reasons.push('seo')
  const patches = blockPatches(fixture, remote.componentTree, defaults)
  if (!patches || patches.some((patch) => Object.keys(patch).length > 0)) reasons.push('blocks')
  // Only a page that differs in content is published as part of the update; this one is on its own.
  if (reasons.length === 0 && remote.status !== 'published') reasons.push('unpublished')
  return { reasons, patches }
}

/**
 * What the seed would do. A fixture without a page in the CMS is created, one that differs is
 * updated, the rest is skipped. A slug of `navigation.json` without a fixture and a CMS page
 * without a fixture are skipped too, and never removed.
 */
export function planSeed(
  fixtures: readonly DeliveryPage[],
  navigation: NavigationConfig,
  remote: RemoteState,
): SeedAction[] {
  const actions: SeedAction[] = []
  const planned = new Set<string>()
  const slugs = new Set<string>()

  for (const fixture of [...fixtures].sort((a, b) => a.slug.localeCompare(b.slug))) {
    assertFlat(fixture)
    const slug = cmsSlug(fixture.slug)
    planned.add(remoteKey(slug, fixture.locale))
    slugs.add(slug)
    const detail = remote.details.get(remoteKey(slug, fixture.locale))
    if (!detail) {
      actions.push({ slug, kind: 'create', reasons: [], fixture })
      continue
    }
    const { reasons, patches } = differences(fixture, detail, remote.defaults)
    actions.push(
      reasons.length > 0
        ? { slug, kind: 'update', reasons, fixture, remote: detail, patches }
        : { slug, kind: 'skip', reasons: ['unchanged'], fixture, remote: detail },
    )
  }

  const noFixture = new Set<string>()
  for (const group of navigation.groups) {
    for (const item of group.items) {
      const slug = cmsSlug(item.slug)
      if (slugs.has(slug) || noFixture.has(slug)) continue
      noFixture.add(slug)
      actions.push({ slug, kind: 'skip', reasons: ['no fixture'] })
    }
  }

  for (const page of remote.pages) {
    if (planned.has(remoteKey(page.slug, page.locale)) || noFixture.has(page.slug)) continue
    actions.push({
      slug: page.slug,
      // Same slug as a fixture, other locale: say which page is meant.
      ...(slugs.has(page.slug) ? { locale: page.locale } : {}),
      kind: 'skip',
      reasons: ['not in fixtures'],
    })
  }
  return actions
}

/** `create  /slug`, `update  /slug (blocks, seo)`, `skip    /slug (unchanged)` and a summary. */
export function formatPlan(plan: readonly SeedAction[]): string {
  const lines = plan.map(({ kind, slug, locale, reasons }) => {
    const why = reasons.length > 0 ? ` (${reasons.join(', ')})` : ''
    return `${kind.padEnd(8)}${slug}${locale ? ` [${locale}]` : ''}${why}`
  })
  const count = (kind: SeedKind) => plan.filter((action) => action.kind === kind).length
  lines.push(`seed: ${count('create')} create, ${count('update')} update, ${count('skip')} skip`)
  return lines.join('\n')
}

/**
 * Writes what `reasons` names, in this order: the tree (patched with `patches`, or removed and
 * added again when that is `null`), the title, the seo. Each write feeds its token to the next.
 */
async function writeContent(
  client: SeedClient,
  pageId: string,
  from: string,
  fixture: DeliveryPage,
  remoteNodes: readonly RemoteNode[],
  patches: Record<string, unknown>[] | null,
  reasons: ReadonlySet<string>,
): Promise<void> {
  let updatedAt = from

  if (reasons.has('blocks')) {
    if (patches) {
      for (const [i, propsPatch] of patches.entries()) {
        if (Object.keys(propsPatch).length === 0) continue
        updatedAt = (
          await client.updateBlockProps({
            pageId,
            expectedUpdatedAt: updatedAt,
            nodeId: (remoteNodes[i] as RemoteNode).id,
            propsPatch,
          })
        ).updatedAt
      }
    } else {
      for (const node of remoteNodes) {
        updatedAt = (
          await client.removeBlock({ pageId, expectedUpdatedAt: updatedAt, nodeId: node.id })
        ).updatedAt
      }
      for (const node of fixture.componentTree) {
        updatedAt = (
          await client.addBlock({
            pageId,
            expectedUpdatedAt: updatedAt,
            type: node.type,
            props: node.props,
          })
        ).updatedAt
      }
    }
  }
  if (reasons.has('title')) {
    updatedAt = (
      await client.updatePage({ pageId, expectedUpdatedAt: updatedAt, title: fixture.title })
    ).updatedAt
  }
  if (reasons.has('seo')) {
    updatedAt = (
      await client.updateSeo({
        pageId,
        expectedUpdatedAt: updatedAt,
        seo: fixture.seo as Record<string, unknown>,
      })
    ).updatedAt
  }
}

/**
 * Carries out `plan`: creates and updates the pages, then publishes each one (the last write of
 * a page, so a failure in between leaves a draft that the next run completes). With `dryRun`
 * it calls nothing.
 */
export async function applySeed(
  client: SeedClient,
  plan: readonly SeedAction[],
  { dryRun = false, onAction }: { dryRun?: boolean; onAction?: (action: SeedAction) => void } = {},
): Promise<void> {
  if (dryRun) return
  for (const action of plan) {
    if (action.kind === 'skip') continue
    onAction?.(action)

    let pageId: string
    if (action.kind === 'create') {
      const fixture = action.fixture as DeliveryPage
      const created = await client.createPage({
        title: fixture.title,
        slug: action.slug,
        locale: fixture.locale,
        layoutKey: fixture.layout.key,
      })
      pageId = created.id
      const reasons = new Set(['blocks'])
      if (Object.keys(fixture.seo).length > 0) reasons.add('seo')
      await writeContent(client, pageId, created.updatedAt, fixture, [], null, reasons)
    } else {
      const remote = action.remote as RemoteDetail
      pageId = remote.id
      await writeContent(
        client,
        pageId,
        remote.updatedAt,
        action.fixture as DeliveryPage,
        remote.componentTree,
        action.patches ?? null,
        new Set(action.reasons),
      )
    }
    await client.publishPage(pageId)
  }
}
