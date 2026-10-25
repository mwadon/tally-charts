// @vitest-environment node
import { draftMode } from 'next/headers'
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import DocPage, { generateMetadata, generateStaticParams } from './page'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('next/headers', () => ({ draftMode: vi.fn() }))

const setDraft = (isEnabled: boolean) =>
  vi.mocked(draftMode).mockResolvedValue({ isEnabled } as never)

beforeEach(() => setDraft(false))

const params = (slug: string) => ({ params: Promise.resolve({ slug }) })

async function html(slug: string) {
  const stream = await renderToReadableStream(await DocPage(params(slug)))
  await stream.allReady
  return new Response(stream).text()
}

afterEach(() => vi.unstubAllEnvs())

describe('generateStaticParams', () => {
  test('lists the pages of the content source', async () => {
    expect(await generateStaticParams()).toContainEqual({ slug: 'line-chart' })
  })

  test('leaves out home, which lives at /', async () => {
    const slugs = (await generateStaticParams()).map((p) => p.slug)

    expect(slugs).not.toContain('home')
    expect(slugs).not.toContain('navigation')
  })
})

describe('the LineChart page', () => {
  test('has the group as eyebrow, the title as h1 and the blocks as h2 sections', async () => {
    const out = await html('line-chart')

    expect(out).toContain('<p class="eyebrow">Charts</p>')
    expect(out).toMatch(/<h1>LineChart<\/h1>/)
    for (const id of ['when-to-use', 'install', 'examples', 'props', 'keyboard']) {
      expect(out, id).toMatch(new RegExp(`<h2 id="${id}"`))
    }
  })

  test('renders the blocks: the chart, the highlighted source, the props table', async () => {
    const out = await html('line-chart')

    expect(out).toContain('Monthly revenue, actual and forecast')
    expect(out).toContain('Copy code: revenue-forecast.tsx')
    expect(out).toContain('Props of LineChart')
  })

  test('has the table of contents in both forms, linking to the h2 anchors', async () => {
    const out = await html('line-chart')

    expect(out).toContain('aria-label="On this page"')
    expect(out).toContain('<a href="#props">Props</a>')
    expect(out).toContain('<a href="#install">Import</a>')
  })
})

describe('draft mode', () => {
  test('shows the preview banner', async () => {
    setDraft(true)
    const out = await html('line-chart')

    expect(out).toContain('role="alert"')
    expect(out).toContain('Preview mode')
    expect(out).toMatch(/<h1>LineChart<\/h1>/)
  })

  test('has no banner otherwise', async () => {
    const out = await html('line-chart')

    expect(out).not.toContain('role="alert"')
    expect(out).not.toContain('Preview mode')
  })

  test('is read for the metadata too, and home is still not a route', async () => {
    setDraft(true)

    expect((await generateMetadata(params('line-chart'))).title).toBe('LineChart · tally-charts')
    await expect(DocPage(params('home'))).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('an unknown page', () => {
  test.each(['does-not-exist', 'home', 'navigation', '../etc'])(
    '/docs/%s is not found',
    async (slug) => {
      await expect(DocPage(params(slug))).rejects.toThrow('NEXT_NOT_FOUND')
    },
  )
})

describe('generateMetadata', () => {
  test('sets the canonical for the route and noindex outside production', async () => {
    vi.stubEnv('SITE_URL', 'https://docs.example.com')
    const meta = await generateMetadata(params('line-chart'))

    expect(meta.title).toBe('LineChart · tally-charts')
    expect(meta.alternates?.canonical).toBe('https://docs.example.com/docs/line-chart')
    expect(meta.robots).toMatchObject({ index: false })
  })

  test('has the Getting started page', async () => {
    expect((await generateMetadata(params('getting-started'))).title).toBe(
      'Getting started · tally-charts',
    )
    await expect(DocPage(params('getting-started'))).resolves.toBeTruthy()
  })

  test('is empty for a missing page', async () => {
    expect(await generateMetadata(params('nope'))).toEqual({})
  })
})
