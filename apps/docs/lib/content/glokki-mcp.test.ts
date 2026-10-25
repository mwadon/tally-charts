// @vitest-environment node
import { describe, expect, test, vi } from 'vitest'
import { createGlokkiMcpClient } from './glokki-mcp'

interface Sent {
  url: string
  headers: Record<string, string>
  body: { id?: number; method: string; params?: { name?: string; arguments?: unknown } }
}

const json = (body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...headers },
  })

const toolResult = (value: unknown, isError = false) => ({
  result: {
    isError,
    content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
  },
})

/** A server that answers `initialize` with a session id and each tool call with `handle`. */
function mockServer(
  handle: (name: string, args: unknown, sent: Sent[]) => Response | Promise<Response>,
) {
  const sent: Sent[] = []
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const request: Sent = {
      url: String(url),
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    }
    sent.push(request)
    const { id, method, params } = request.body
    if (method === 'initialize') {
      return json({ jsonrpc: '2.0', id, result: {} }, { 'mcp-session-id': 'session-1' })
    }
    if (method === 'notifications/initialized') return new Response(null, { status: 202 })
    return handle(params?.name ?? '', params?.arguments, sent)
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, sent }
}

const options = (fetch: typeof globalThis.fetch, sleep = vi.fn(async () => {})) => ({
  baseUrl: 'https://cms.example/',
  apiKey: 'ek_secret',
  fetch,
  sleep,
})

const page = { id: 'p1', slug: '/a', title: 'A', locale: 'en', status: 'published' }

describe('the handshake', () => {
  test('initializes once, then sends the session id and the bearer key with every call', async () => {
    const { fetch, sent } = mockServer(() =>
      json({ jsonrpc: '2.0', id: 9, ...toolResult({ total: 1, pages: [page] }) }),
    )
    const client = createGlokkiMcpClient(options(fetch))

    await client.listPages()
    await client.listPages()

    expect(sent.map((s) => s.body.method)).toEqual([
      'initialize',
      'notifications/initialized',
      'tools/call',
      'tools/call',
    ])
    expect(sent.every((s) => s.url === 'https://cms.example/api/mcp/mcp')).toBe(true)
    expect(sent.every((s) => s.headers.Authorization === 'Bearer ek_secret')).toBe(true)
    expect(sent[0]?.headers['Mcp-Session-Id']).toBeUndefined()
    expect(sent.slice(1).every((s) => s.headers['Mcp-Session-Id'] === 'session-1')).toBe(true)
    expect(sent[0]?.headers.Accept).toContain('text/event-stream')
  })
})

describe('the responses', () => {
  test('reads an SSE stream and picks the message with the id of the request', async () => {
    const { fetch } = mockServer((_name, _args, sent) => {
      const id = sent.at(-1)?.body.id
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        ...toolResult({ total: 1, pages: [page] }),
      })
      const other = JSON.stringify({ jsonrpc: '2.0', method: 'notifications/message' })
      return new Response(
        `event: message\ndata: ${other}\n\nevent: message\ndata: ${message}\n\n`,
        {
          headers: { 'content-type': 'text/event-stream' },
        },
      )
    })

    await expect(createGlokkiMcpClient(options(fetch)).listPages()).resolves.toEqual([page])
  })

  test('reads CRLF events, data split over lines, comments and keep-alives', async () => {
    const { fetch } = mockServer((_name, _args, sent) => {
      const id = sent.at(-1)?.body.id
      const text = JSON.stringify(toolResult({ total: 1, pages: [page] }).result, null, 1)
      const head = `{"jsonrpc":"2.0","id":${id},"result":`
      const lines = `${head}${text}}`.split('\n').map((line) => `data: ${line}`)
      return new Response(
        [': keep-alive', 'data:', 'data: not json', '', 'id: 7', ...lines, '', ''].join('\r\n'),
        { headers: { 'content-type': 'text/event-stream' } },
      )
    })

    await expect(createGlokkiMcpClient(options(fetch)).listPages()).resolves.toEqual([page])
  })

  test('a stream without the answer to the request is an error', async () => {
    const { fetch } = mockServer(
      () =>
        new Response('data: {"jsonrpc":"2.0","id":99,"result":{}}\n\n', {
          headers: { 'content-type': 'text/event-stream' },
        }),
    )

    await expect(createGlokkiMcpClient(options(fetch)).listPages()).rejects.toThrow(
      /no response to request/,
    )
  })

  test('getBlockDefaults reads defaultProps from get_block_schema', async () => {
    const { fetch, sent } = mockServer((name) =>
      json({
        jsonrpc: '2.0',
        id: 1,
        ...toolResult(name === 'get_block_schema' ? { type: 'prose', defaultProps: { a: 1 } } : {}),
      }),
    )

    const defaults = await createGlokkiMcpClient(options(fetch)).getBlockDefaults('prose')

    expect(defaults).toEqual({ a: 1 })
    expect(sent.at(-1)?.body.params).toEqual({
      name: 'get_block_schema',
      arguments: { type: 'prose' },
    })
  })

  test('pages through search_pages until the total', async () => {
    const rows = Array.from({ length: 150 }, (_, i) => ({ ...page, id: `p${i}`, slug: `/p${i}` }))
    const { fetch } = mockServer((_name, args) => {
      const { offset, limit } = args as { offset: number; limit: number }
      return json({
        jsonrpc: '2.0',
        id: 1,
        ...toolResult({ total: rows.length, pages: rows.slice(offset, offset + limit) }),
      })
    })

    await expect(createGlokkiMcpClient(options(fetch)).listPages()).resolves.toHaveLength(150)
  })

  test('a tool result with isError throws an error that names the tool', async () => {
    const { fetch } = mockServer(() =>
      json({
        jsonrpc: '2.0',
        id: 1,
        ...toolResult('{"code":"STALE_PAGE","message":"changed"}', true),
      }),
    )
    const client = createGlokkiMcpClient(options(fetch))

    await expect(
      client.removeBlock({ pageId: 'p1', expectedUpdatedAt: '1', nodeId: 'n' }),
    ).rejects.toThrow(/^remove_block: .*STALE_PAGE/)
  })

  test('a JSON-RPC error and an HTTP error throw with the method', async () => {
    const rpcError = mockServer(() => json({ jsonrpc: '2.0', id: 1, error: { message: 'boom' } }))
    await expect(createGlokkiMcpClient(options(rpcError.fetch)).listPages()).rejects.toThrow(
      /tools\/call: .*boom/,
    )

    const http = mockServer(() => new Response('nope', { status: 401 }))
    await expect(createGlokkiMcpClient(options(http.fetch)).listPages()).rejects.toThrow(
      /tools\/call: HTTP 401 nope/,
    )
  })

  test('a result of an unexpected shape names the tool', async () => {
    const { fetch } = mockServer(() => json({ jsonrpc: '2.0', id: 1, ...toolResult({ pages: 1 }) }))

    await expect(createGlokkiMcpClient(options(fetch)).listPages()).rejects.toThrow(
      /^search_pages: unexpected result/,
    )
  })

  test('sends the arguments of the tools as the SeedClient gets them', async () => {
    const { fetch, sent } = mockServer((name) =>
      json({ jsonrpc: '2.0', id: 1, ...toolResult({ id: 'p1', updatedAt: '2', status: name }) }),
    )
    const client = createGlokkiMcpClient(options(fetch))

    await client.createPage({ title: 'T', slug: '/t', locale: 'en', layoutKey: 'default' })
    await client.publishPage('p1')

    const calls = sent.filter((s) => s.body.method === 'tools/call').map((s) => s.body.params)
    expect(calls).toEqual([
      {
        name: 'create_page',
        arguments: { title: 'T', slug: '/t', locale: 'en', layoutKey: 'default' },
      },
      { name: 'publish_page', arguments: { pageId: 'p1' } },
    ])
  })
})

describe('rate limits', () => {
  test('RATE_LIMITED waits retryAfterSeconds and retries the same call', async () => {
    let attempts = 0
    const { fetch } = mockServer(() => {
      attempts += 1
      return json({
        jsonrpc: '2.0',
        id: 1,
        ...(attempts === 1
          ? toolResult(
              '{"code":"RATE_LIMITED","message":"Retry after 7s.","details":{"retryAfterSeconds":7,"category":"mcp:publish"}}',
              true,
            )
          : toolResult({ status: 'published', updatedAt: '3' })),
      })
    })
    const sleep = vi.fn(async () => {})
    const onRateLimit = vi.fn()
    const client = createGlokkiMcpClient({ ...options(fetch, sleep), onRateLimit })

    await client.publishPage('p1')

    expect(attempts).toBe(2)
    expect(sleep).toHaveBeenCalledExactlyOnceWith(7000)
    expect(onRateLimit).toHaveBeenCalledExactlyOnceWith('publish_page', 7)
  })

  test('RATE_LIMIT_UNAVAILABLE is retried too, and the retries have a limit', async () => {
    const { fetch } = mockServer(() =>
      json({
        jsonrpc: '2.0',
        id: 1,
        ...toolResult('{"code":"RATE_LIMIT_UNAVAILABLE","details":{"retryAfterSeconds":2}}', true),
      }),
    )
    const sleep = vi.fn(async () => {})

    await expect(createGlokkiMcpClient(options(fetch, sleep)).publishPage('p1')).rejects.toThrow(
      /^publish_page: .*RATE_LIMIT_UNAVAILABLE/,
    )
    expect(sleep).toHaveBeenCalledTimes(5)
  })

  test('HTTP 429 waits for Retry-After and does not repeat the handshake', async () => {
    let tries = 0
    const { fetch, sent } = mockServer(() => {
      tries += 1
      return tries === 1
        ? new Response('slow down', { status: 429, headers: { 'Retry-After': '12' } })
        : json({ jsonrpc: '2.0', id: 1, ...toolResult({ total: 0, pages: [] }) })
    })
    const sleep = vi.fn(async () => {})

    await createGlokkiMcpClient(options(fetch, sleep)).listPages()

    expect(sleep).toHaveBeenCalledExactlyOnceWith(12000)
    expect(sent.filter((s) => s.body.method === 'initialize')).toHaveLength(1)
  })

  test('any other tool error is not retried', async () => {
    const { fetch } = mockServer(() =>
      json({ jsonrpc: '2.0', id: 1, ...toolResult('{"code":"FORBIDDEN"}', true) }),
    )
    const sleep = vi.fn(async () => {})

    await expect(createGlokkiMcpClient(options(fetch, sleep)).publishPage('p1')).rejects.toThrow(
      /FORBIDDEN/,
    )
    expect(sleep).not.toHaveBeenCalled()
  })
})
