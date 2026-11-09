import { headingId, headingSchema } from '../../blocks/heading'
import { symbols } from '../../blocks/props-table-view'
import {
  blockSchemas,
  describeSchemaIssue,
  parseBlockProps,
  type SchemaIssue,
} from '../../blocks/registry'
import { examples } from '../../examples.generated'
import type { ComponentNode, DeliveryPage } from './types'

export interface ContentIssue {
  slug: string
  nodeId?: string
  /** The block type of the node, when the issue belongs to one. */
  type?: string
  message: string
}

export interface ApiCoverage {
  covered: string[]
  missing: string[]
}

export interface CheckResult {
  errors: ContentIssue[]
  coverage: ApiCoverage
}

/** `slug › nodeId (type): message`; a page-level issue has no node part, a coverage one no slug. */
export function formatIssue({ slug, nodeId, type, message }: ContentIssue) {
  if (slug === '') return message
  if (nodeId === undefined) return `${slug}: ${message}`
  return `${slug} › ${nodeId}${type ? ` (${type})` : ''}: ${message}`
}

/** The props of a block type that hold markdown, and so may link to other pages. */
const MARKDOWN_PROPS: Record<string, string[]> = {
  prose: ['markdown'],
  callout: ['markdown'],
}

/** The array prop of a block type whose items have an `href` (`hero.actions`, `link-row.items`). */
const HREF_LIST_PROPS: Record<string, string> = {
  hero: 'actions',
  'link-row': 'items',
}

function* walk(nodes: readonly ComponentNode[]): Generator<ComponentNode> {
  for (const node of nodes) {
    yield node
    yield* walk(node.children ?? [])
  }
}

/** Fenced code and inline code hold examples of links, not links. */
function withoutCode(markdown: string) {
  return markdown
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/`[^`\n]*`/g, '')
}

const LINK_PATTERNS = [
  // [text](/docs/slug), also with a title: [text](/docs/slug "title")
  /\]\(\s*<?\/docs\/([^\s)>#?]*)/g,
  // </docs/slug>
  /<\/docs\/([^\s>#?]*)>/g,
  // [ref]: /docs/slug
  /^\s{0,3}\[[^\]]+\]:\s*<?\/docs\/([^\s>#?]*)/gm,
]

/** The slugs that `markdown` links to through `/docs/<slug>` (anchor and query are dropped). */
export function docsLinkSlugs(markdown: string): string[] {
  const text = withoutCode(markdown)
  const slugs = LINK_PATTERNS.flatMap((pattern) =>
    [...text.matchAll(pattern)].map((match) => (match[1] ?? '').replace(/\/+$/, '')),
  )
  return [...new Set(slugs)]
}

const HREF_SLUG = /^\/docs\/([^?#]*)/

/** The slug an `href` of a button or a link row points at, when it is `/docs/<slug>`. */
function hrefSlug(href: unknown): string | undefined {
  if (typeof href !== 'string') return undefined
  return HREF_SLUG.exec(href.trim())?.[1]?.replace(/\/+$/, '') || undefined
}

/** The `/docs/<slug>` targets of a node: markdown links, hero buttons, link row items. */
function linkTargets(node: ComponentNode): string[] {
  const props: Record<string, unknown> = node.props ?? {}
  const targets = (MARKDOWN_PROPS[node.type] ?? []).flatMap((prop) => {
    const markdown = props[prop]
    return typeof markdown === 'string' ? docsLinkSlugs(markdown) : []
  })
  const list = props[HREF_LIST_PROPS[node.type] ?? '']
  if (Array.isArray(list)) {
    for (const item of list) {
      const slug = hrefSlug((item as { href?: unknown } | null)?.href)
      if (slug !== undefined) targets.push(slug)
    }
  }
  return [...new Set(targets)]
}

function checkNode(slug: string, node: ComponentNode, issues: ContentIssue[]) {
  const issue = (message: string) =>
    issues.push({ slug, nodeId: node.id, type: node.type, message })
  const props: Record<string, unknown> = node.props ?? {}
  // Props the explicit checks below already reported, so the schema does not repeat them.
  const reported = new Set<string>()

  if (!Object.hasOwn(blockSchemas, node.type)) {
    issue(`unknown block type "${node.type}"`)
    return
  }
  const result = parseBlockProps(node.type, props)

  if (node.type === 'chart-example' && typeof props.exampleId === 'string') {
    if (!Object.hasOwn(examples, props.exampleId)) {
      issue(`exampleId "${props.exampleId}" does not exist in examples/`)
      reported.add('exampleId')
    }
  }
  if (node.type === 'props-table' && typeof props.symbol === 'string') {
    if (!Object.hasOwn(symbols, props.symbol)) {
      issue(`symbol "${props.symbol}" is not in api.generated.json`)
      reported.add('symbol')
    }
  }

  if (!result.success) {
    const zodIssues = (result.error as { issues: SchemaIssue[] }).issues
    for (const zodIssue of zodIssues) {
      const [first] = zodIssue.path
      if (typeof first === 'string' && reported.has(first)) continue
      issue(describeSchemaIssue(zodIssue))
    }
  }
}

/**
 * The pages of one source: block types and props, example ids, symbols, internal links (markdown,
 * hero buttons, link rows), heading ids that repeat within a page, API coverage.
 */
export function checkPages(
  pages: readonly DeliveryPage[],
  { requireCoverage = false }: { requireCoverage?: boolean } = {},
): CheckResult {
  const errors: ContentIssue[] = []
  const slugs = new Set(pages.map((page) => page.slug))
  const used = new Set<string>()

  for (const page of pages) {
    // Heading id → the node that has it first: a second one would be an anchor nobody reaches.
    const headingIds = new Map<string, string>()

    for (const node of walk(page.componentTree)) {
      const issue = (message: string) =>
        errors.push({ slug: page.slug, nodeId: node.id, type: node.type, message })
      checkNode(page.slug, node, errors)

      if (node.type === 'props-table' && typeof node.props?.symbol === 'string') {
        used.add(node.props.symbol)
      }
      for (const target of linkTargets(node)) {
        if (!slugs.has(target)) issue(`link /docs/${target} points at a missing page "${target}"`)
      }
      if (node.type === 'heading') {
        const heading = headingSchema.safeParse(node.props)
        if (!heading.success) continue
        const id = headingId(heading.data)
        const first = headingIds.get(id)
        if (first === undefined) headingIds.set(id, node.id)
        else issue(`heading id "${id}" is already used by ${first}; set another anchor`)
      }
    }
  }

  const all = Object.keys(symbols)
  const coverage: ApiCoverage = {
    covered: all.filter((name) => used.has(name)),
    missing: all.filter((name) => !used.has(name)),
  }
  if (requireCoverage) {
    for (const name of coverage.missing) {
      errors.push({
        slug: '',
        message: `API coverage: ${name} (${symbols[name]?.kind}) has no PropsTable on any page`,
      })
    }
  }
  return { errors, coverage }
}
