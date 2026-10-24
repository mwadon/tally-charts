import { expect, test } from '@playwright/test'

test('home page renders the heading and a tally-charts chart without errors', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text())
  })
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'tally-charts' })).toBeVisible()
  const chart = page.getByRole('application', { name: 'Margin by week, last 6 weeks' })
  await expect(chart).toBeVisible()
  await expect(chart.locator('svg')).toBeVisible()

  expect(errors).toEqual([])
})
