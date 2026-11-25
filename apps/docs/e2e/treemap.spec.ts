import { expect, type Page, test } from '@playwright/test'
import { revealCharts, tabTo, themeSuite } from './support'

const FIRST = 'Revenue and margin by service line'
const FLAT = 'Service lines without groups'
const VALUE_ONLY = 'Open estimates by branch'
const TONE = 'Hours by job and overrun'

themeSuite({
  name: 'treemap',
  path: '/docs/treemap',
  h1: 'Treemap',
  chart: FIRST,
  chartRole: 'listbox',
})

/** The root of the treemap whose listbox has `name`. */
const chartOf = (page: Page, name: string) =>
  page.locator('[data-ch-part="treemap"]').filter({
    has: page.getByRole('listbox', { name, exact: true }),
  })

test('/docs/treemap is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/treemap')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'Treemap' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'Treemap', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/treemap')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'Treemap' })).toHaveCount(0)
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 375, height: 800 } })

  // The first card is server-rendered at initialWidth 640: until the plot is measured it clips
  // its tiles, so the page does not scroll sideways (spec §5 reflow).
  test('the server-rendered treemap does not widen a 375 px page', async ({ page }) => {
    await page.goto('/docs/treemap')
    const plot = page.locator('[data-ch-part="treemap-plot"]').first()
    await expect(plot).toHaveAttribute('data-ch-unmeasured', 'true')
    // Non-vacuity: the tiles are laid out wider than the page.
    const widest = await plot.evaluate((el) =>
      Math.max(
        ...[...el.querySelectorAll<HTMLElement>('[data-ch-part="treemap-tile"]')].map(
          (t) => Number.parseFloat(t.style.left) + Number.parseFloat(t.style.width),
        ),
      ),
    )
    expect(widest).toBeGreaterThan(375)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(375)
  })
})

test('/docs/treemap documents the Treemap props once', async ({ page }) => {
  await page.goto('/docs/treemap')

  await expect(page.getByRole('region', { name: 'Props of Treemap', exact: true })).toHaveCount(1)
})

test('the page shows the four Treemap examples as listboxes of options', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/docs/treemap')
  await revealCharts(page)

  const first = page.getByRole('listbox', { name: FIRST, exact: true })
  await expect(first.getByRole('group')).toHaveCount(4)
  await expect(first.getByRole('option')).toHaveCount(13)
  const repairs = first.getByRole('group', { name: 'Repairs $480K', exact: true })
  await expect(repairs.getByRole('option')).toHaveCount(4)
  await expect(
    repairs.getByRole('option', {
      name: 'Handyman, $54K, 2.9% of total, gross margin 18%, 10% to 20%',
      exact: true,
    }),
  ).toHaveCount(1)
  await expect(chartOf(page, FIRST).locator('[data-ch-part="legend"] li')).toHaveText([
    'Under 10%',
    '10% to 20%',
    '20% to 30%',
    '30% to 40%',
    '40% and up',
  ])

  const flat = page.getByRole('listbox', { name: FLAT, exact: true })
  await expect(flat.getByRole('group')).toHaveCount(0)
  await expect(flat.getByRole('option')).toHaveCount(13)
  await expect(chartOf(page, FLAT).locator('[data-ch-part="treemap-group"]')).toHaveCount(0)

  // No shade: every tile is the middle level and there is no legend.
  const plain = chartOf(page, VALUE_ONLY)
  await expect(plain.locator('[data-ch-part="treemap-legend"]')).toHaveCount(0)
  await expect(plain.locator('[data-ch-part="treemap-tile"]')).toHaveCount(10)
  await expect(plain.locator('[data-ch-part="treemap-tile"]:not([data-ch-level="3"])')).toHaveCount(
    0,
  )
  await expect(
    page.getByRole('listbox', { name: VALUE_ONLY, exact: true }).getByRole('option', {
      name: 'Alder Court kitchen, $84K, 25.3% of total',
      exact: true,
    }),
  ).toHaveCount(1)

  // Custom bin labels in the loss tone; the row without an overrun has no shade.
  const tone = chartOf(page, TONE)
  await expect(tone).toHaveAttribute('data-ch-seq-tone', 'loss')
  await expect(tone.locator('[data-ch-part="treemap-legend-title"]')).toHaveText('Overrun')
  await expect(tone.locator('[data-ch-part="legend"] li')).toHaveText([
    'On or under plan',
    'Up to 10% over',
    '10 to 25% over',
    'Over 25%',
  ])
  const warranty = page
    .getByRole('listbox', { name: TONE, exact: true })
    .getByRole('option', { name: 'Hazel Way warranty visit, 26 h, 1.7% of total', exact: true })
  await expect(warranty).toHaveAttribute('data-ch-level', '0')
})

test('the keyboard reaches the first treemap, and End, Home and Escape work', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/docs/treemap')

  const first = page.getByRole('listbox', { name: FIRST, exact: true })
  const outline = await tabTo(page, '[data-ch-part="treemap-tile"][tabindex="0"]')
  expect(outline.style).toBe('solid')
  expect(outline.width).toBe(2)
  await expect(
    first.getByRole('option', { name: /^Kitchen, \$412K, 22\.4% of total/ }),
  ).toBeFocused()

  const tooltip = chartOf(page, FIRST).locator('[data-ch-part="treemap-tooltip"]')
  await expect(tooltip).toContainText('22.4% of total')

  await page.keyboard.press('End')
  await expect(
    first.getByRole('option', {
      name: 'Seasonal, $38K, 2.1% of total, gross margin 41%, 40% and up',
      exact: true,
    }),
  ).toBeFocused()
  await expect(tooltip).toContainText('Gross margin 41%')

  await page.keyboard.press('Home')
  await expect(first.getByRole('option', { name: /^Kitchen, / })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await expect(first.getByRole('option', { name: /^Kitchen, / })).toBeFocused()
})
