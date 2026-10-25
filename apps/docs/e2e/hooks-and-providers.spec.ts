import { expect, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'hooks-and-providers',
  path: '/docs/hooks-and-providers',
  h1: 'Hooks and providers',
  chart: 'Average order value by month, as lollipops',
})

test('/docs/hooks-and-providers is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/hooks-and-providers')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Hooks and providers' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Hooks and providers' })
  await expect(link).toHaveAttribute('href', '/docs/hooks-and-providers')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Hooks and providers' })).toHaveCount(0)
})

test('/docs/hooks-and-providers documents the provider and the three hooks', async ({ page }) => {
  await page.goto('/docs/hooks-and-providers')

  // A component has "Props of …", a hook with parameters "Parameters of …". useChart and
  // useFormat take none, so their block says so instead of showing a table.
  await expect(page.getByRole('region', { name: /^(Props|Parameters) of / })).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Props of ChartsProvider' })).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Parameters of useRegisterPoints' })).toHaveCount(1)
  await expect(page.getByText('useChart has no parameters.')).toBeVisible()
  await expect(page.getByText('useFormat has no parameters.')).toBeVisible()
})

test('the charts inside the provider format numbers as de-DE and EUR', async ({ page }) => {
  await page.goto('/docs/hooks-and-providers')

  const chart = page.getByRole('application', { name: 'Revenue by month, in euros' })
  const live = page.locator('[data-ch-root]').filter({ has: chart }).locator('[aria-live="polite"]')
  await chart.focus()
  await page.keyboard.press('Home')
  await expect(live).toContainText('1 of 6')
  await expect(live).toContainText('12.400')
  await expect(live).toContainText('€')

  await expect(page.getByText('Revenue in June', { exact: true })).toBeVisible()
  await expect(page.locator('[data-ch-part="stat-value"]').first()).toHaveText('18.350 €')
})

test('the custom mark announces its registered points from the keyboard', async ({ page }) => {
  await page.goto('/docs/hooks-and-providers')
  await revealCharts(page)

  const chart = page.getByRole('application', {
    name: 'Average order value by month, as lollipops',
  })
  const live = page.locator('[data-ch-root]').filter({ has: chart }).locator('[aria-live="polite"]')
  await chart.focus()
  await page.keyboard.press('Home')
  await expect(live).toContainText('1 of 6')
  await expect(live).toContainText('Jan, £48')

  await page.keyboard.press('End')
  await expect(live).toContainText('6 of 6')
  await expect(live).toContainText('Jun, £74')
})
