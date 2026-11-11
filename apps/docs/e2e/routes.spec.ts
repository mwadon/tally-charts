import { expect, test } from '@playwright/test'

test.describe('pages that do not exist', () => {
  for (const path of ['/docs/does-not-exist', '/docs/home']) {
    test(`${path} is a 404`, async ({ page }) => {
      const response = await page.goto(path)
      expect(response?.status()).toBe(404)
    })
  }
})

test('sitemap.xml lists the home page and /docs/line-chart', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(xml).toContain('/docs/line-chart</loc>')
  expect(xml).toMatch(/<loc>http:\/\/localhost:3100<\/loc>/)
  // The fixtures have no real date of change.
  expect(xml).not.toContain('<lastmod>')
})

test.describe('security headers', () => {
  // A page, a docs page, a 404, an API route, a metadata route and a static file.
  for (const path of [
    '/',
    '/docs/line-chart',
    '/does-not-exist',
    '/api/revalidate',
    '/sitemap.xml',
    '/icon.svg',
  ]) {
    test(`${path} has nosniff, the referrer policy and frame-ancestors`, async ({ request }) => {
      const headers = (await request.get(path)).headers()

      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
      // This build has no NEXT_PUBLIC_CMS_EDITOR_ORIGIN, so only the site may frame itself.
      expect(headers['content-security-policy']).toBe("frame-ancestors 'self'")
    })
  }
})

test('/docs redirects to Getting started', async ({ page, request }) => {
  const response = await request.get('/docs', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers().location).toBe('/docs/getting-started')

  await page.goto('/docs')
  await expect(page).toHaveURL(/\/docs\/getting-started$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Getting started' })).toBeVisible()
})

test('/cdn is a quiet 404 without a CMS', async ({ request }) => {
  expect((await request.get('/cdn/some/asset.png')).status()).toBe(404)
  expect((await request.head('/cdn/some/asset.png')).status()).toBe(404)
})

test.describe('icon and Open Graph image', () => {
  for (const path of ['/', '/docs/line-chart']) {
    test(`${path} links the SVG icon and the Open Graph image`, async ({ page, request }) => {
      await page.goto(path)

      const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute('href')
      expect(icon).toMatch(/^\/icon\.svg/)
      const iconResponse = await request.get(icon ?? '')
      expect(iconResponse.status()).toBe(200)
      expect(iconResponse.headers()['content-type']).toContain('image/svg+xml')

      // Browsers without SVG favicons take the .ico; iOS takes the Apple icon.
      const ico = await page.locator('link[rel="icon"][href^="/favicon.ico"]').getAttribute('href')
      expect((await request.get(ico ?? '')).status()).toBe(200)
      const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
      expect(apple).toMatch(/^\/apple-icon/)
      const appleResponse = await request.get(apple ?? '')
      expect(appleResponse.status()).toBe(200)
      expect(appleResponse.headers()['content-type']).toContain('image/png')

      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute(
        'content',
        'tally-charts',
      )
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website')
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      )
      for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
        const url = await page.locator(selector).getAttribute('content')
        expect(url, selector).toMatch(/^http:\/\/localhost:3100\/opengraph-image/)
        const image = await request.get(new URL(url ?? '').pathname + new URL(url ?? '').search)
        expect(image.status()).toBe(200)
        expect(image.headers()['content-type']).toBe('image/png')
      }
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute(
        'content',
        '1200',
      )
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute(
        'content',
        '630',
      )
      await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
        'content',
        /tally-charts/,
      )
    })
  }
})

test('robots.txt disallows everything outside production', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  expect(await response.text()).toContain('Disallow: /')
})

test('POST /api/revalidate without the secret is 401', async ({ request }) => {
  expect((await request.post('/api/revalidate')).status()).toBe(401)
  const wrong = await request.post('/api/revalidate', {
    headers: { authorization: 'Bearer wrong' },
  })
  expect(wrong.status()).toBe(401)
})

test('GET /api/revalidate is not allowed', async ({ request }) => {
  expect((await request.get('/api/revalidate')).status()).toBe(405)
})

test('/docs/line-chart is noindex and has a canonical link to itself', async ({ page }) => {
  await page.goto('/docs/line-chart')

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/docs\/line-chart$/)
  await expect(page).toHaveTitle('LineChart · tally-charts')
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
    'content',
    /\/docs\/line-chart$/,
  )
})

test('the home page is noindex too', async ({ page }) => {
  await page.goto('/')

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})
