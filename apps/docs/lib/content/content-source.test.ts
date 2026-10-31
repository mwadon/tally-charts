// @vitest-environment node
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createClient } from '@glokki-cms/sdk'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createFixtureSource } from './fixtures'
import { createGlokkiSource } from './glokki'
import { getContentSource } from './index'
import type { ContentSource, DeliveryPage, Navigation } from './types'

vi.mock('@glokki-cms/sdk', async (importOriginal) => {
  const sdk = await importOriginal<typeof import('@glokki-cms/sdk')>()
  return { ...sdk, createClient: vi.fn(sdk.createClient) }
})

const page: DeliveryPage = {
  pageId: 'p1',
  versionId: 'v1',
  version: 3,
  title: 'LineChart',
  slug: 'line-chart',
  componentTree: [
    { id: 'a', type: 'heading', props: { text: 'Props', level: '2' }, children: [] },
    { id: 'b', type: 'prose', props: { markdown: 'Hello' } },
  ],
  seo: { metaTitle: 'LineChart · tally-charts' },
  codeInjection: {},
  locale: 'en',
  publishedAt: '2026-10-25T00:00:00.000Z',
  layout: { key: 'default', header: null, footer: null },
}

const listItem = {
  pageId: page.pageId,
  versionId: page.versionId as string,
  version: page.version,
  title: page.title,
  slug: page.slug,
  locale: page.locale,
  publishedAt: page.publishedAt,
}

const navigationConfig = {
  groups: [
    {
      label: 'Charts',
      items: [
        { label: 'LineChart', slug: 'line-chart' },
        { label: 'Heatmap', slug: 'heatmap' },
      ],
    },
  ],
}

const expectedNavigation: Navigation = {
  groups: [
    {
      label: 'Charts',
      items: [
        { label: 'LineChart', slug: 'line-chart', available: true },
        { label: 'Heatmap', slug: 'heatmap', available: false },
      ],
    },
  ],
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** A fake delivery API serving `page` and one list item. */
function deliveryApi(total = 1) {
  return vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.pathname === '/api/v1/delivery/pages/by-slug/line-chart') return json({ data: page })
    if (url.pathname.startsWith('/api/v1/delivery/pages/by-slug/')) {
      return json({ error: { code: 'NOT_FOUND', message: 'No such page' } }, 404)
    }
    if (url.pathname === '/api/v1/delivery/pages') {
      const offset = Number(url.searchParams.get('offset'))
      const limit = Number(url.searchParams.get('limit'))
      const count = Math.min(limit, total - offset)
      const data = Array.from({ length: count }, (_, i) => ({
        ...listItem,
        slug: total === 1 ? 'line-chart' : `page-${offset + i}`,
      }))
      return json({ data, meta: { total, limit, offset } })
    }
    if (url.pathname === '/api/v1/delivery/navigation') {
      return json({ data: [{ slug: 'line-chart', title: 'LineChart', locale: 'en' }] })
    }
    return json({ error: { code: 'NOT_FOUND', message: url.pathname } }, 404)
  })
}

let dir: string
let fetchMock: ReturnType<typeof deliveryApi>

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'content-'))
  await writeFile(path.join(dir, 'line-chart.json'), JSON.stringify(page))
  await writeFile(path.join(dir, 'navigation.json'), JSON.stringify(navigationConfig))
  fetchMock = deliveryApi()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(createClient).mockClear()
})

afterEach(async () => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  await rm(dir, { recursive: true, force: true })
})

const sources: [string, () => ContentSource][] = [
  ['fixtures', () => createFixtureSource({ dir })],
  [
    'glokki',
    () =>
      createGlokkiSource({
        baseUrl: 'https://cms.test/',
        tenant: 'acme',
        apiKey: 'key-1',
        navigationConfig: async () => navigationConfig,
      }),
  ],
]

describe.each(sources)('ContentSource (%s)', (_name, create) => {
  test('getPage returns the page', async () => {
    expect(await create().getPage('line-chart')).toEqual(page)
  })

  test('getPage returns null for an unknown slug', async () => {
    expect(await create().getPage('nope')).toBeNull()
  })

  test('getPage returns null for anything but a plain slug, without reading from outside', async () => {
    const source = create()
    for (const slug of ['../navigation', 'a/b', '..', '', 'Line-Chart']) {
      expect(await source.getPage(slug)).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('listPages lists the slugs', async () => {
    expect(await create().listPages()).toEqual([listItem])
  })

  test('getNavigation keeps the configured groups and flags the pages that exist', async () => {
    expect(await create().getNavigation()).toEqual(expectedNavigation)
  })
})

describe('fixtures', () => {
  test('navigation.json is not a page', async () => {
    const source = createFixtureSource({ dir })
    expect(await source.getPage('navigation')).toBeNull()
    expect((await source.listPages()).map((p) => p.slug)).toEqual(['line-chart'])
  })

  test('a slug that is not a plain slug is not read from disk', async () => {
    await mkdir(path.join(dir, 'sub'))
    await writeFile(path.join(dir, '..', 'outside.json'), JSON.stringify(page))
    const source = createFixtureSource({ dir })
    expect(await source.getPage('../outside')).toBeNull()
    expect(await source.getPage('sub/x')).toBeNull()
  })

  test('an invalid fixture fails with its file name', async () => {
    await writeFile(path.join(dir, 'broken.json'), JSON.stringify({ ...page, title: 5 }))
    await expect(createFixtureSource({ dir }).getPage('broken')).rejects.toThrow(/^broken\.json:/)
  })

  test('a fixture that is not JSON fails with its file name', async () => {
    await writeFile(path.join(dir, 'broken.json'), '{ nope')
    await expect(createFixtureSource({ dir }).getPage('broken')).rejects.toThrow(/^broken\.json:/)
  })

  test('an invalid navigation.json fails with its file name', async () => {
    await writeFile(path.join(dir, 'navigation.json'), JSON.stringify({ groups: [{ label: 1 }] }))
    await expect(createFixtureSource({ dir }).getNavigation()).rejects.toThrow(/^navigation\.json:/)
  })
})

describe('glokki', () => {
  const create = () => sources[1]?.[1]() as ContentSource

  test('requests the by-slug URL with the API key and tenant headers', async () => {
    await create().getPage('line-chart')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(String(url)).toBe('https://cms.test/api/v1/delivery/pages/by-slug/line-chart')
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer key-1')
    expect(headers['X-Tenant-Slug']).toBe('acme')
  })

  test('tags every fetch with cms', async () => {
    const source = create()
    await source.getPage('line-chart')
    await source.getPage('nope')
    await source.listPages()
    await source.getNavigation()

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4)
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as { next?: { tags?: string[] } }).next?.tags).toEqual(['cms'])
    }
  })

  test('with preview every fetch is no-store and not tagged, and reads still work', async () => {
    const source = createGlokkiSource({
      baseUrl: 'https://cms.test/',
      tenant: 'acme',
      apiKey: 'key-1',
      preview: true,
      navigationConfig: async () => navigationConfig,
    })
    expect(await source.getPage('line-chart')).toEqual(page)
    await source.getPage('nope')
    await source.listPages()
    expect(await source.getNavigation()).toEqual(expectedNavigation)

    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(4)
    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.cache).toBe('no-store')
      expect((init as { next?: unknown }).next).toBeUndefined()
    }
  })

  test('without preview the fetches are tagged and have no cache option', async () => {
    await create().getPage('line-chart')

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.cache).toBeUndefined()
    expect((init as { next?: { tags?: string[] } }).next?.tags).toEqual(['cms'])
  })

  test('pages through the list until total', async () => {
    fetchMock = deliveryApi(250)
    vi.stubGlobal('fetch', fetchMock)

    const pages = await create().listPages()

    expect(pages).toHaveLength(250)
    expect(new Set(pages.map((p) => p.slug)).size).toBe(250)
    const offsets = fetchMock.mock.calls.map(([url]) =>
      new URL(String(url)).searchParams.get('offset'),
    )
    expect(offsets).toEqual(['0', '100', '200'])
    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).searchParams.get('limit')).toBe('100')
  })

  test('a page of an unexpected shape fails with its slug', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ data: [{ nope: true }] })),
    )
    await expect(create().getPage('line-chart')).rejects.toThrow(/line-chart/)
  })

  test('an API error other than 404 is thrown', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ error: { code: 'X', message: 'boom' } }, 500)),
    )
    await expect(create().getPage('line-chart')).rejects.toThrow('boom')
  })
})

describe('glokki delivery slugs', () => {
  // The delivery API answers with the slug as stored: a leading `/`.
  const slashed = () =>
    vi.fn(async (input: string | URL | Request) => {
      const { pathname } = new URL(String(input))
      if (pathname === '/api/v1/delivery/pages/by-slug/line-chart') {
        return json({ data: { ...page, slug: '/line-chart' } })
      }
      if (pathname === '/api/v1/delivery/pages') {
        const meta = { total: 1, limit: 100, offset: 0 }
        return json({ data: [{ ...listItem, slug: '/line-chart' }], meta })
      }
      if (pathname === '/api/v1/delivery/navigation') {
        return json({ data: [{ slug: '/line-chart', title: 'LineChart', locale: 'en' }] })
      }
      return json({ error: { code: 'NOT_FOUND', message: pathname } }, 404)
    })
  const source = () =>
    createGlokkiSource({
      baseUrl: 'https://cms.test/',
      tenant: 'acme',
      apiKey: 'key-1',
      navigationConfig: async () => navigationConfig,
    })

  test('getPage, listPages and getNavigation hand out the slug without the slash', async () => {
    vi.stubGlobal('fetch', slashed())

    expect(await source().getPage('line-chart')).toEqual(page)
    expect(await source().listPages()).toEqual([listItem])
    expect(await source().getNavigation()).toEqual(expectedNavigation)
  })
})

describe('getContentSource', () => {
  test('without CMS_BASE_URL it reads the fixtures', () => {
    expect(getContentSource({}).kind).toBe('fixtures')
    expect(getContentSource({ CMS_TENANT: 'acme' }).kind).toBe('fixtures')
  })

  test('with CMS_BASE_URL, CMS_TENANT and CMS_API_KEY it uses glokki', () => {
    const env = { CMS_BASE_URL: 'https://cms.test', CMS_TENANT: 'acme', CMS_API_KEY: 'k' }
    expect(getContentSource(env).kind).toBe('cms')
  })

  test('CMS_BASE_URL without the tenant or the key is an error that names what is missing', () => {
    expect(() => getContentSource({ CMS_BASE_URL: 'https://cms.test', CMS_TENANT: 'a' })).toThrow(
      'CMS_API_KEY',
    )
    expect(() => getContentSource({ CMS_BASE_URL: 'https://cms.test', CMS_API_KEY: 'k' })).toThrow(
      'CMS_TENANT',
    )
  })

  test('with preview and CMS_BASE_URL it is still glokki, without it still fixtures', () => {
    const env = { CMS_BASE_URL: 'https://cms.test', CMS_TENANT: 'acme', CMS_API_KEY: 'k' }
    expect(getContentSource(env, true).kind).toBe('cms')
    expect(getContentSource({}, true).kind).toBe('fixtures')
  })

  describe('glokki reads through the client', () => {
    const env = { CMS_BASE_URL: 'https://cms.test', CMS_TENANT: 'acme', CMS_API_KEY: 'k' }
    const readEverything = async (preview?: boolean) => {
      const source = getContentSource(env, preview)
      expect((await source.getPage('line-chart'))?.slug).toBe('line-chart')
      await source.getPage('nope')
      await source.listPages()
    }

    test('with preview the client is created with preview: true and every fetch is no-store', async () => {
      await readEverything(true)

      expect(createClient).toHaveBeenCalledTimes(1)
      expect(vi.mocked(createClient).mock.calls[0]?.[0]).toMatchObject({
        baseUrl: 'https://cms.test',
        tenantSlug: 'acme',
        preview: true,
      })
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)
      for (const [, init] of fetchMock.mock.calls) {
        expect(init?.cache).toBe('no-store')
        expect((init as { next?: unknown }).next).toBeUndefined()
      }
    })

    test.each([
      ['no flag', undefined],
      ['preview false', false],
    ])('with %s the client is not in preview and every fetch is tagged cms', async (_n, flag) => {
      await readEverything(flag)

      expect(vi.mocked(createClient).mock.calls[0]?.[0]).not.toHaveProperty('preview', true)
      expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3)
      for (const [, init] of fetchMock.mock.calls) {
        expect(init?.cache).toBeUndefined()
        expect((init as { next?: { tags?: string[] } }).next?.tags).toEqual(['cms'])
      }
    })
  })

  test('fixtures read the same pages with and without preview', async () => {
    const [plain, preview] = [getContentSource({}), getContentSource({}, true)]
    expect(await preview.getPage('line-chart')).toEqual(await plain.getPage('line-chart'))
    expect(await preview.listPages()).toEqual(await plain.listPages())
  })

  test('defaults to process.env', () => {
    vi.stubEnv('CMS_BASE_URL', '')
    expect(getContentSource().kind).toBe('fixtures')
  })
})
