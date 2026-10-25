import { z } from 'zod'
import type { RemoteDetail, RemotePage, SeedClient, Written } from './seed'

const PAGE_SIZE = 100
const MAX_RETRIES = 5
const DEFAULT_RETRY_SECONDS = 60

export interface GlokkiMcpOptions {
  baseUrl: string
  /** The admin key (`CMS_ADMIN_API_KEY`), sent as `Authorization: Bearer`. */
  apiKey: string
  fetch?: typeof fetch
  /** Waits out a rate limit; replaced in tests. */
  sleep?: (ms: number) => Promise<void>
  /** Called before waiting out a rate limit. */
  onRateLimit?: (what: string, seconds: number) => void
}

const rpcMessageSchema = z.looseObject({
  id: z.union([z.number(), z.string()]).optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional(),
})

const toolResultSchema = z.looseObject({
  isError: z.boolean().optional(),
  content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })).default([]),
})

// The shapes of the tool results, as returned by the glökki server (app/api/mcp in the editor
// repo): `search_pages` rows and `get_page` call the status `status`, a write returns `updatedAt`.
// This is the only place that knows them.
const pageRowSchema = z.looseObject({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  locale: z.string(),
  status: z.string(),
})
const searchSchema = z.looseObject({ total: z.number(), pages: z.array(pageRowSchema) })
const detailSchema = pageRowSchema.extend({
  updatedAt: z.string(),
  componentTree: z.array(
    z.looseObject({ id: z.string(), type: z.string(), props: z.record(z.string(), z.unknown()) }),
  ),
  seo: z.record(z.string(), z.unknown()).nullable(),
})
const blockSchemaSchema = z.looseObject({
  defaultProps: z.record(z.string(), z.unknown()).nullish(),
})
const writtenSchema = z.looseObject({ updatedAt: z.string() })
const createdSchema = writtenSchema.extend({ id: z.string() })

/** The seconds of a rate-limit refusal (`details.retryAfterSeconds`), or `null` for any other error. */
function toolRetryAfter(text: string): number | null {
  try {
    const error = JSON.parse(text) as {
      code?: unknown
      details?: { retryAfterSeconds?: unknown }
    }
    if (error.code !== 'RATE_LIMITED' && error.code !== 'RATE_LIMIT_UNAVAILABLE') return null
    return Number(error.details?.retryAfterSeconds) || DEFAULT_RETRY_SECONDS
  } catch {
    return null
  }
}

/** The `data` of each event of an SSE stream: lines joined by `\n`, comments and other fields dropped. */
function sseData(body: string): string[] {
  const events: string[][] = []
  let lines: string[] = []
  for (const line of body.split(/\r\n|\r|\n/)) {
    if (line === '') {
      if (lines.length > 0) events.push(lines)
      lines = []
    } else if (line.startsWith('data:')) {
      lines.push(line.slice('data:'.length).replace(/^ /, ''))
    }
  }
  if (lines.length > 0) events.push(lines)
  return events.map((event) => event.join('\n'))
}

/** The message of a streamable HTTP response: a JSON body or an SSE stream with the answer to `id`. */
function parseMessage(body: string, contentType: string, id: number) {
  if (!contentType.includes('text/event-stream')) return rpcMessageSchema.parse(JSON.parse(body))
  for (const data of sseData(body)) {
    let json: unknown
    try {
      json = JSON.parse(data)
    } catch {
      continue // not a JSON-RPC message (a keep-alive, a priming event)
    }
    const message = rpcMessageSchema.safeParse(json)
    if (message.success && message.data.id === id) return message.data
  }
  throw new Error(`no response to request ${id} in the event stream: ${body.slice(0, 300)}`)
}

/**
 * A `SeedClient` over the glökki MCP server (streamable HTTP at `<baseUrl>/api/mcp/mcp`): the
 * handshake on the first call, then `Mcp-Session-Id` on every request. Waits and retries when
 * the server says it is rate limited (HTTP 429/503 with `Retry-After`, or the tool errors
 * `RATE_LIMITED` / `RATE_LIMIT_UNAVAILABLE`, which `publish_page` has: 10 calls a minute per key).
 */
export function createGlokkiMcpClient({
  baseUrl,
  apiKey,
  fetch: fetchImpl = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  onRateLimit,
}: GlokkiMcpOptions): SeedClient {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/mcp/mcp`
  let sessionId: string | undefined
  let nextId = 0
  let handshake: Promise<void> | undefined

  async function wait(what: string, seconds: number) {
    onRateLimit?.(what, seconds)
    await sleep(seconds * 1000)
  }

  async function post(method: string, params: unknown, notify = false) {
    const id = notify ? undefined : ++nextId
    for (let attempt = 0; ; attempt++) {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          ...(id === undefined ? {} : { id }),
          method,
          params,
        }),
      })
      sessionId = response.headers.get('mcp-session-id') ?? sessionId
      if ((response.status === 429 || response.status === 503) && attempt < MAX_RETRIES) {
        await wait(method, Number(response.headers.get('retry-after')) || DEFAULT_RETRY_SECONDS)
        continue
      }
      if (!response.ok) {
        throw new Error(
          `${method}: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`,
        )
      }
      if (id === undefined) return undefined
      const message = parseMessage(
        await response.text(),
        response.headers.get('content-type') ?? '',
        id,
      )
      if (message.error) throw new Error(`${method}: ${JSON.stringify(message.error)}`)
      return message.result
    }
  }

  function connect() {
    handshake ??= (async () => {
      await post('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'tally-charts-docs-seed', version: '1.0.0' },
      })
      await post('notifications/initialized', undefined, true)
    })()
    return handshake
  }

  async function tool(name: string, args: Record<string, unknown>): Promise<unknown> {
    await connect()
    for (let attempt = 0; ; attempt++) {
      const result = toolResultSchema.parse(await post('tools/call', { name, arguments: args }))
      const text = result.content.find((part) => part.type === 'text')?.text ?? ''
      if (result.isError) {
        const seconds = toolRetryAfter(text)
        if (seconds !== null && attempt < MAX_RETRIES) {
          await wait(name, seconds)
          continue
        }
        throw new Error(`${name}: ${text}`)
      }
      try {
        return JSON.parse(text)
      } catch {
        throw new Error(`${name}: the result is not JSON: ${text.slice(0, 300)}`)
      }
    }
  }

  async function call<T>(name: string, args: Record<string, unknown>, schema: z.ZodType<T>) {
    const parsed = schema.safeParse(await tool(name, args))
    if (!parsed.success)
      throw new Error(`${name}: unexpected result: ${z.prettifyError(parsed.error)}`)
    return parsed.data
  }

  const written = (name: string, args: Record<string, unknown>): Promise<Written> =>
    call(name, args, writtenSchema)

  return {
    async listPages() {
      const pages: RemotePage[] = []
      for (;;) {
        const page = await call(
          'search_pages',
          { limit: PAGE_SIZE, offset: pages.length },
          searchSchema,
        )
        pages.push(...page.pages)
        if (page.pages.length === 0 || pages.length >= page.total) return pages
      }
    },
    async getPage(pageId) {
      const page = await call('get_page', { pageId }, detailSchema)
      return { ...page, seo: page.seo ?? {} } satisfies RemoteDetail
    },
    async getBlockDefaults(type) {
      const schema = await call('get_block_schema', { type }, blockSchemaSchema)
      return schema.defaultProps ?? {}
    },
    createPage: (args) => call('create_page', args, createdSchema),
    addBlock: (args) => written('add_block', args),
    updateBlockProps: (args) => written('update_block_props', args),
    removeBlock: (args) => written('remove_block', args),
    updatePage: (args) => written('update_page', args),
    updateSeo: (args) => written('update_seo', args),
    async publishPage(pageId) {
      await tool('publish_page', { pageId })
    },
  }
}
