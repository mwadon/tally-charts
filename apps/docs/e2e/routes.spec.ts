import { expect, test } from '@playwright/test'

test.describe('pages that do not exist', () => {
  for (const path of ['/docs/does-not-exist', '/docs/getting-started', '/docs/home']) {
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
