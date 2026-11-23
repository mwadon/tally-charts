import { expect, type Page, test } from '@playwright/test'
import { revealCharts, themeSuite } from './support'

themeSuite({
  name: 'gantt-chart',
  path: '/docs/gantt-chart',
  h1: 'GanttChart',
  chart: 'Kitchen remodel',
})

const NAMES = ['Kitchen remodel', 'Office move', 'Deck build', 'Year plan']

const chartOf = (page: Page, name: string) => page.getByRole('application', { name, exact: true })

const labelsOf = (page: Page, name: string) =>
  chartOf(page, name).locator('[data-ch-part="gantt"]').getAttribute('data-ch-labels')

test('/docs/gantt-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/gantt-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'GanttChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'GanttChart', exact: true })
  await expect(link).toHaveAttribute('href', '/docs/gantt-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'GanttChart' })).toHaveCount(0)
})

test('/docs/gantt-chart documents the GanttChart props once', async ({ page }) => {
  await page.goto('/docs/gantt-chart')

  await expect(page.getByRole('region', { name: 'Props of GanttChart', exact: true })).toHaveCount(
    1,
  )
})

test('the page has all four examples', async ({ page }) => {
  await page.goto('/docs/gantt-chart')
  await revealCharts(page)

  for (const name of NAMES) await expect(chartOf(page, name)).toBeVisible()
})

test.describe('1280 px', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('names are left of the bars; the key and the today line follow the data', async ({
    page,
  }) => {
    await page.goto('/docs/gantt-chart')
    await revealCharts(page)

    for (const name of NAMES) expect(await labelsOf(page, name)).toBe('left')

    const remodel = chartOf(page, 'Kitchen remodel')
    await expect(remodel.locator('[data-ch-part="gantt-heading"]')).toHaveCount(3)
    await expect(remodel.locator('[data-ch-part="gantt-milestone"]')).toHaveCount(2)
    await expect(remodel.locator('[data-ch-part="gantt-key-item"]')).toHaveCount(5)
    await expect(remodel.locator('[data-ch-part="gantt-now-label"]')).toHaveText('Today · Mar 27')
    await expect(remodel.locator('[data-ch-part="gantt-over"]')).toHaveText([
      '+1d',
      '+2d',
      '+3d',
      '+3d',
    ])

    // `progress` without `now`: done and planned in the key, no today line.
    const office = chartOf(page, 'Office move')
    await expect(office.locator('[data-ch-part="gantt-key-item"]')).toHaveCount(2)
    await expect(office.locator('[data-ch-part="gantt-now"]')).toHaveCount(0)

    // Start and end only: every bar solid, so no key.
    const deck = chartOf(page, 'Deck build')
    await expect(deck.locator('[data-ch-part="gantt-key"]')).toHaveCount(0)
    await expect(deck.locator('[data-ch-part="gantt-segment"][data-ch-fill="hatch"]')).toHaveCount(
      0,
    )

    await expect(chartOf(page, 'Year plan').locator('[data-ch-part="gantt-heading"]')).toHaveCount(
      3,
    )
  })

  test('the keyboard walks the rows and announces dates, days and status', async ({ page }) => {
    await page.goto('/docs/gantt-chart')
    const chart = chartOf(page, 'Kitchen remodel')
    await chart.focus()
    const live = chart.locator('xpath=ancestor::figure[1]').locator('[aria-live]')
    await expect(live).toHaveText('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
    await page.keyboard.press('ArrowDown')
    await expect(live).toHaveText(
      '2 of 13, Demolition, Mar 4 – Mar 9, 5 days, done, 1 day over baseline',
    )
    await page.keyboard.press('End')
    await expect(live).toHaveText(
      '13 of 13, Final walkthrough, milestone, Apr 17, upcoming, 3 days late',
    )
  })
})

test.describe('375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('names are above the bars', async ({ page }) => {
    await page.goto('/docs/gantt-chart')
    await revealCharts(page)

    for (const name of NAMES) expect(await labelsOf(page, name)).toBe('top')
  })
})
