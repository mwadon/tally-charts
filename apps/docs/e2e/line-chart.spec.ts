import { expect, test } from '@playwright/test'
import { tabTo, themeSuite } from './support'

const CHART = 'Monthly revenue, actual and forecast'

themeSuite({ name: 'line-chart', path: '/docs/line-chart', h1: 'LineChart', chart: CHART })

test('Tab reaches the wordmark and the Preview/Code toggle, both with a visible outline', async ({
  page,
}) => {
  await page.goto('/docs/line-chart')

  const wordmark = await tabTo(page, '.wordmark')
  expect(wordmark.style).toBe('solid')
  expect(wordmark.width).toBeGreaterThan(0)

  const toggle = await tabTo(page, '.segmented button')
  expect(toggle.style).toBe('solid')
  expect(toggle.width).toBeGreaterThan(0)
})

test('the toggle swaps the live chart for the source and back', async ({ page }) => {
  await page.goto('/docs/line-chart')
  const chart = page.getByRole('application', { name: CHART })
  const source = page.getByRole('region', { name: `Source of: ${CHART}` })
  await expect(chart).toBeVisible()
  await expect(source).toBeHidden()

  await page.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(source).toBeVisible()
  await expect(chart).toBeHidden()

  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(chart).toBeVisible()
})

test('the sidebar has the five groups and the ToC links jump to the h2 anchors', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/docs/line-chart')

  const nav = page.getByRole('navigation', { name: 'Documentation' })
  await expect(nav.getByRole('heading', { level: 2 })).toHaveText([
    'Start',
    'Guides',
    'Charts',
    'Building blocks',
    'Reference',
  ])
  for (const name of ['Start', 'Guides', 'Charts', 'Building blocks', 'Reference']) {
    await expect(nav.getByRole('region', { name })).toHaveCount(1)
  }
  await expect(nav.getByRole('link', { name: 'LineChart' })).toHaveAttribute('aria-current', 'page')

  await page
    .getByRole('navigation', { name: 'On this page' })
    .getByRole('link', { name: 'Props' })
    .click()
  await expect(page).toHaveURL(/#props$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Props' })).toBeInViewport()
})

test('the Menu button is hidden at 1280 px and visible at 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/docs/line-chart')
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden()

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible()
})

test('at 375 px the menu button opens and closes the navigation panel', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/docs/line-chart')

  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const menu = page.getByRole('button', { name: 'Menu' })
  await expect(nav).toBeHidden()
  await expect(menu).toHaveAttribute('aria-expanded', 'false')

  await menu.click()
  await expect(nav).toBeVisible()
  await expect(menu).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('Escape')
  await expect(nav).toBeHidden()
})

test('the ToC is a disclosure above the content at 375 px and a sticky column at 1280 px', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/docs/line-chart')
  await expect(page.locator('.toc-inline')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeHidden()

  await page.setViewportSize({ width: 1280, height: 900 })
  await expect(page.locator('.toc-inline')).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'On this page' })).toBeVisible()
})
