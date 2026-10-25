// @vitest-environment node
import { renderToReadableStream } from 'react-dom/server'
import { afterEach, describe, expect, test, vi } from 'vitest'
import DocPage, { generateMetadata, generateStaticParams } from './page'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

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

describe('an unknown page', () => {
  test.each(['does-not-exist', 'getting-started', 'home', 'navigation', '../etc'])(
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

  test('is empty for a missing page', async () => {
    expect(await generateMetadata(params('nope'))).toEqual({})
  })
})
