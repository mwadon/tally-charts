import { expect, type Page, test } from '@playwright/test'
import { PREVIEW_SECRET } from './preview-secret'

// Next's route announcer is an empty role=alert too, so the banner is found by its text.
const banner = (page: Page) => page.getByRole('alert').filter({ hasText: 'Preview mode' })

test('the right secret turns on draft mode and lands on the page with the banner', async ({
  page,
}) => {
  await page.goto(`/preview?slug=line-chart&secret=${PREVIEW_SECRET}`)

  await expect(page).toHaveURL(/\/docs\/line-chart$/)
  await expect(banner(page)).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'LineChart' })).toBeVisible()
})

test('slug=home lands on / with the banner', async ({ page }) => {
  await page.goto(`/preview?slug=home&secret=${PREVIEW_SECRET}`)

  await expect(page).toHaveURL('http://127.0.0.1:3100/')
  await expect(banner(page)).toBeVisible()
})

test('the secret works in the Authorization header too', async ({ page }) => {
  await page.setExtraHTTPHeaders({ authorization: `Bearer ${PREVIEW_SECRET}` })
  await page.goto('/preview?slug=line-chart')
  await page.setExtraHTTPHeaders({})

  await expect(page).toHaveURL(/\/docs\/line-chart$/)
  await expect(banner(page)).toBeVisible()
})

test('the banner can be dismissed', async ({ page }) => {
  await page.goto(`/preview?slug=line-chart&secret=${PREVIEW_SECRET}`)

  await page.getByRole('button', { name: 'Dismiss preview banner' }).click()

  await expect(banner(page)).toHaveCount(0)
})

test('a fresh browser context has no banner', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto('/docs/line-chart')

  await expect(page.getByRole('heading', { level: 1, name: 'LineChart' })).toBeVisible()
  await expect(banner(page)).toHaveCount(0)
  await context.close()
})

test('draft mode of one context does not leak to another', async ({ page, request }) => {
  // `request` has its own cookie jar: the preview response sets the cookie only there.
  await request.get(`/preview?slug=line-chart&secret=${PREVIEW_SECRET}`, { maxRedirects: 0 })
  await page.goto('/')

  await expect(banner(page)).toHaveCount(0)
})

test.describe('rejected requests', () => {
  test('a wrong secret is 401 and does not redirect', async ({ request }) => {
    const response = await request.get('/preview?slug=line-chart&secret=nope', { maxRedirects: 0 })

    expect(response.status()).toBe(401)
    expect(response.headers().location).toBeUndefined()
  })

  test('no secret is 401', async ({ request }) => {
    const response = await request.get('/preview?slug=line-chart', { maxRedirects: 0 })

    expect(response.status()).toBe(401)
    expect(response.headers().location).toBeUndefined()
  })

  for (const slug of ['../x', 'a%2Fb', '%2F%2Fevil.com', 'https%3A%2F%2Fevil.com', '']) {
    test(`the slug "${slug}" with the right secret is 400 and does not redirect`, async ({
      request,
    }) => {
      const response = await request.get(`/preview?slug=${slug}&secret=${PREVIEW_SECRET}`, {
        maxRedirects: 0,
      })

      expect(response.status()).toBe(400)
      expect(response.headers().location).toBeUndefined()
    })
  }
})
