import { createFixtureSource } from './fixtures'
import type { NavigationConfig } from './navigation-config'
import type { DeliveryPage } from './types'

/** A page as the CMS lists it. `slug` starts with `/`. */
export interface RemotePage {
  id: string
  slug: string
  title: string
  /**
   * glökki's page status. Editing a published page sets it back to `draft` (the live version
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

/** The glökki operations the seed needs; `glokki-mcp.ts` implements them, tests fake them. */
export interface SeedClient {
  listPages(): Promise<RemotePage[]>
  getPage(pageId: string): Promise<RemoteDetail>
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
  kind: SeedKind
  /**
   * `update`: what differs (`title`, `seo`, `blocks`, `unpublished`). `skip`: why (`unchanged`,
   * `no fixture`, `not in fixtures`). Empty for `create`.
   */
  reasons: string[]
  fixture?: DeliveryPage
  remote?: RemoteDetail
}

/** What is already in the CMS: every page, and the full page for each one that has a fixture. */
export interface RemoteState {
  pages: RemotePage[]
  details: ReadonlyMap<string, RemoteDetail>
}

export const cmsSlug = (fixtureSlug: string) => `/${fixtureSlug}`

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
  const wanted = new Set(fixtures.map((fixture) => cmsSlug(fixture.slug)))
  const details = new Map<string, RemoteDetail>()
  for (const page of pages) {
    if (wanted.has(page.slug)) details.set(page.slug, await client.getPage(page.id))
  }
  return { pages, details }
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

/** Every key of `want` is in `have` with an equal value; extra keys of `have` are ignored. */
function covers(have: Record<string, unknown>, want: Record<string, unknown>) {
  return Object.entries(want).every(([key, value]) => deepEqual(have[key], value))
}

function assertFlat(fixture: DeliveryPage) {
  if (fixture.componentTree.some((node) => node.children?.length)) {
    throw new Error(`${fixture.slug}: nested blocks are not supported by the seed`)
  }
}

const sameTypes = (fixture: DeliveryPage, remote: RemoteDetail) =>
  fixture.componentTree.length === remote.componentTree.length &&
  fixture.componentTree.every((node, i) => node.type === remote.componentTree[i]?.type)

/**
 * Ignoring the node ids (the server mints them) and the keys the server adds from `defaultProps`:
 * a page is in order when the title, the seo fields of the fixture, the block types in order and
 * every prop of the fixture match, and it is published with no unpublished changes. Anything
 * else would never let a second run come out empty.
 */
function differences(fixture: DeliveryPage, remote: RemoteDetail): string[] {
  const reasons: string[] = []
  if (fixture.title !== remote.title) reasons.push('title')
  if (!covers(remote.seo, fixture.seo as Record<string, unknown>)) reasons.push('seo')
  if (
    !sameTypes(fixture, remote) ||
    !fixture.componentTree.every((node, i) =>
      covers(remote.componentTree[i]?.props ?? {}, node.props),
    )
  ) {
    reasons.push('blocks')
  }
  // Only a page that differs in content is published as part of the update; this one is on its own.
  if (reasons.length === 0 && remote.status !== 'published') reasons.push('unpublished')
  return reasons
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

  for (const fixture of [...fixtures].sort((a, b) => a.slug.localeCompare(b.slug))) {
    assertFlat(fixture)
    const slug = cmsSlug(fixture.slug)
    planned.add(slug)
    const detail = remote.details.get(slug)
    if (!detail) {
      actions.push({ slug, kind: 'create', reasons: [], fixture })
      continue
    }
    const reasons = differences(fixture, detail)
    actions.push(
      reasons.length > 0
        ? { slug, kind: 'update', reasons, fixture, remote: detail }
        : { slug, kind: 'skip', reasons: ['unchanged'], fixture, remote: detail },
    )
  }

  for (const group of navigation.groups) {
    for (const item of group.items) {
      const slug = cmsSlug(item.slug)
      if (planned.has(slug)) continue
      planned.add(slug)
      actions.push({ slug, kind: 'skip', reasons: ['no fixture'] })
    }
  }

  for (const page of remote.pages) {
    if (planned.has(page.slug)) continue
    planned.add(page.slug)
    actions.push({ slug: page.slug, kind: 'skip', reasons: ['not in fixtures'] })
  }
  return actions
}

/** `create  /slug`, `update  /slug (blocks, seo)`, `skip    /slug (unchanged)` and a summary. */
export function formatPlan(plan: readonly SeedAction[]): string {
  const lines = plan.map(({ kind, slug, reasons }) => {
    const why = reasons.length > 0 ? ` (${reasons.join(', ')})` : ''
    return `${kind.padEnd(8)}${slug}${why}`
  })
  const count = (kind: SeedKind) => plan.filter((action) => action.kind === kind).length
  lines.push(`seed: ${count('create')} create, ${count('update')} update, ${count('skip')} skip`)
  return lines.join('\n')
}

/**
 * Writes what `reasons` names, in this order: the tree (patched when the block types match,
 * otherwise removed and added again), the title, the seo. Each write feeds its token to the next.
 */
async function writeContent(
  client: SeedClient,
  pageId: string,
  from: string,
  fixture: DeliveryPage,
  remoteNodes: readonly RemoteNode[],
  reasons: ReadonlySet<string>,
): Promise<void> {
  let updatedAt = from

  if (reasons.has('blocks')) {
    const sameShape =
      remoteNodes.length === fixture.componentTree.length &&
      remoteNodes.every((node, i) => node.type === fixture.componentTree[i]?.type)
    if (sameShape) {
      for (const [i, node] of fixture.componentTree.entries()) {
        const current = remoteNodes[i] as RemoteNode
        if (covers(current.props, node.props)) continue
        updatedAt = (
          await client.updateBlockProps({
            pageId,
            expectedUpdatedAt: updatedAt,
            nodeId: current.id,
            propsPatch: node.props,
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
      await writeContent(client, pageId, created.updatedAt, fixture, [], reasons)
    } else {
      const remote = action.remote as RemoteDetail
      pageId = remote.id
      await writeContent(
        client,
        pageId,
        remote.updatedAt,
        action.fixture as DeliveryPage,
        remote.componentTree,
        new Set(action.reasons),
      )
    }
    await client.publishPage(pageId)
  }
}
