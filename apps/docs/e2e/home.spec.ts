import { expect, test } from '@playwright/test'
import { tabTo, themeSuite } from './support'

themeSuite({
  name: 'home',
  path: '/',
  h1: 'Opinionated React charts for narrative business dashboards.',
  chart: 'Margin by week, last 6 weeks',
})

test('the wordmark is a text link to / and Tab reaches it with a visible outline', async ({
  page,
}) => {
  await page.goto('/')
  const wordmark = page.getByRole('banner').getByRole('link', { name: 'tally-charts' })
  await expect(wordmark).toHaveAttribute('href', '/')
  expect(await page.locator('img').count()).toBe(0)

  const outline = await tabTo(page, '.wordmark')
  expect(outline.style).toBe('solid')
  expect(outline.width).toBeGreaterThan(0)
})

test('the home page lists the sections in the F16 order', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'A visual language that reads at a glance',
    'Nine reference dashboards',
    'Install',
    'Built for real dashboards',
    'Keep going',
  ])
})
