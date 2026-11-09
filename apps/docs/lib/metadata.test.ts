import { expect, test } from 'vitest'
import type { DeliveryPage } from './content'
import { createFixtureSource } from './content/fixtures'
import { DEFAULT_SITE_URL, pageMetadata, SITE_NAME, siteUrl } from './metadata'

const SITE = 'https://docs.example.com'

async function lineChart(): Promise<DeliveryPage> {
  const page = await createFixtureSource().getPage('line-chart')
  if (!page) throw new Error('missing line-chart fixture')
  return page
}

test('title, description, canonical and Open Graph come from the page and SITE_URL', async () => {
  const meta = pageMetadata(await lineChart(), '/docs/line-chart', { SITE_URL: SITE })

  expect(meta.title).toBe('LineChart · tally-charts')
  expect(meta.description).toContain('Trends over time')
  expect(meta.alternates?.canonical).toBe(`${SITE}/docs/line-chart`)
  expect(meta.openGraph?.title).toBe('LineChart · tally-charts')
  expect(meta.openGraph?.description).toBe(meta.description)
  expect(meta.openGraph?.url).toBe(`${SITE}/docs/line-chart`)
})

test('Open Graph names the site as a website and Twitter gets the large image card', async () => {
  const page = await lineChart()
  for (const seo of [page.seo, {}, { og: { title: 'OG title' } }]) {
    const meta = pageMetadata({ ...page, seo }, '/docs/line-chart', { SITE_URL: SITE })

    expect(meta.openGraph).toMatchObject({ siteName: SITE_NAME, type: 'website' })
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image' })
  }
  expect(SITE_NAME).toBe('tally-charts')
})

test('the image is the one of app/opengraph-image.tsx, for Open Graph and Twitter', async () => {
  const page = await lineChart()
  const meta = pageMetadata({ ...page, seo: {} }, '/docs/line-chart', { SITE_URL: SITE })
  const image = {
    url: `${SITE}/opengraph-image`,
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: 'tally-charts: Opinionated React charts for narrative business dashboards.',
  }

  expect(meta.openGraph).toMatchObject({ images: [image] })
  expect(meta.twitter).toMatchObject({ images: [image] })
})

test('an image of the page wins, also for Twitter', async () => {
  const page = await lineChart()
  const own = pageMetadata(
    { ...page, seo: { og: { image: 'https://cdn.test/a.png', imageAlt: 'A' } } },
    '/docs/line-chart',
    { SITE_URL: SITE },
  )
  expect(own.openGraph).toMatchObject({ images: [{ url: 'https://cdn.test/a.png', alt: 'A' }] })
  expect(own.twitter).toMatchObject({ images: [{ url: 'https://cdn.test/a.png', alt: 'A' }] })

  const twitter = pageMetadata(
    { ...page, seo: { twitter: { image: 'https://cdn.test/t.png' } } },
    '/docs/line-chart',
    { SITE_URL: SITE },
  )
  expect(twitter.twitter).toMatchObject({ images: ['https://cdn.test/t.png'] })
  expect(twitter.openGraph).toMatchObject({ images: [{ url: `${SITE}/opengraph-image` }] })
})

test('without metaTitle the title is the page title plus the site name', async () => {
  const page = await lineChart()
  const meta = pageMetadata({ ...page, seo: {} }, '/docs/line-chart', { SITE_URL: SITE })

  expect(meta.title).toBe('LineChart · tally-charts')
  expect(meta.openGraph?.title).toBe('LineChart · tally-charts')
})

test('a canonicalUrl and og fields of the page win', async () => {
  const page = await lineChart()
  const seo = {
    canonicalUrl: 'https://elsewhere.test/lc',
    og: { title: 'OG title', description: 'OG description' },
  }
  const meta = pageMetadata({ ...page, seo }, '/docs/line-chart', { SITE_URL: SITE })

  expect(meta.alternates?.canonical).toBe('https://elsewhere.test/lc')
  expect(meta.openGraph?.url).toBe('https://elsewhere.test/lc')
  expect(meta.openGraph?.title).toBe('OG title')
  expect(meta.openGraph?.description).toBe('OG description')
})

test('the home page canonical is the site root', async () => {
  const meta = pageMetadata(await lineChart(), '/', { SITE_URL: `${SITE}/` })

  expect(meta.alternates?.canonical).toBe(SITE)
})

test.each([
  ['unset', {}],
  ['preview', { APP_ENV: 'preview' }],
  ['empty', { APP_ENV: '' }],
])('APP_ENV %s is noindex', async (_name, env) => {
  const meta = pageMetadata(await lineChart(), '/docs/line-chart', env)

  expect(meta.robots).toMatchObject({ index: false, follow: false })
})

test('APP_ENV=production is not noindex', async () => {
  const meta = pageMetadata(await lineChart(), '/docs/line-chart', { APP_ENV: 'production' })

  expect(meta.robots).toBeUndefined()
})

test('a page robots directive applies on production', async () => {
  const page = await lineChart()
  const meta = pageMetadata({ ...page, seo: { robots: 'noindex' } }, '/docs/line-chart', {
    APP_ENV: 'production',
  })

  expect(meta.robots).toMatchObject({ index: false })
})

test('siteUrl falls back to the local address and drops a trailing slash', () => {
  expect(siteUrl({})).toBe(DEFAULT_SITE_URL)
  expect(siteUrl({ SITE_URL: '' })).toBe(DEFAULT_SITE_URL)
  expect(siteUrl({ SITE_URL: 'https://a.test//' })).toBe('https://a.test')
})
