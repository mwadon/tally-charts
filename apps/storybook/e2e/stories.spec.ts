import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const STORIES = [
  'reference-last-12-weeks--light',
  'reference-last-12-weeks--dark',
  'primitives-legend--default',
  'charts-barchart--light',
  'charts-barchart--dark',
  'charts-barchart--horizontal',
  'reference-estimate-vs-actual--light',
  'reference-estimate-vs-actual--dark',
  'reference-result--light',
  'reference-result--dark',
  'reference-drill-columns--light',
  'reference-gross-margin--light',
  'reference-gross-margin--dark',
  'primitives-small-pieces--default',
  'reference-why-it-is-under-target--light',
  'reference-why-it-is-under-target--dark',
  'reference-profit-bridge--light',
  'reference-profit-bridge--dark',
]

// Stories whose reference layout needs more room than the default 800px viewport.
const WIDE_STORIES: Record<string, { width: number; height: number }> = {
  'reference-drill-columns--light': { width: 1280, height: 600 },
  'reference-profit-bridge--light': { width: 1280, height: 720 },
  'reference-profit-bridge--dark': { width: 1280, height: 720 },
}

async function open(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
}

for (const id of STORIES) {
  test(`${id} matches its screenshot`, async ({ page }) => {
    const viewport = WIDE_STORIES[id]
    if (viewport) await page.setViewportSize(viewport)
    await open(page, id)
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true })
  })

  test(`${id} has no axe violations`, async ({ page }) => {
    await open(page, id)
    const results = await new AxeBuilder({ page })
      .include('#storybook-root')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })
}

test('keyboard focus shows the tooltip and announces the point', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  const chart = page.locator('[data-ch-root]')
  await chart.focus()
  await page.keyboard.press('End')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Sep 21')
  await expect(chart.locator('[aria-live]')).toHaveText('Sep 21, 34.0%')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})

test('hovering a bar dims the others', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  await page.locator('[data-ch-part="bar-hit"]').nth(3).hover()
  await expect(page.locator('[data-ch-part="bar"][data-ch-dimmed="true"]')).toHaveCount(11)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 27')
})

test('a fast click selects the clicked bar, not the one hovered before', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--selectable')
  const hits = page.locator('[data-ch-part="bar-hit"]')
  await hits.nth(2).hover()
  await hits.nth(7).click()
  await expect(page.getByTestId('selected')).toHaveText('Selected: Aug 24')
})

test.describe('touch', () => {
  test.use({ hasTouch: true })

  test('a tap selects the tapped bar', async ({ page }) => {
    await open(page, 'reference-last-12-weeks--selectable')
    await page.locator('[data-ch-part="bar-hit"]').nth(4).tap()
    await expect(page.getByTestId('selected')).toHaveText('Selected: Aug 3')
  })
})

test('clicking a drill row moves the selection', async ({ page }) => {
  await open(page, 'reference-drill-columns--light')
  const causes = page.getByRole('figure', { name: 'Leakage by cause' })
  await causes.locator('[data-ch-part="bar-hit"]').nth(2).click()
  await expect(page.getByTestId('drill-selected')).toHaveText('Selected cause: Callbacks')
  await expect(causes.locator('[data-ch-part="row-highlight"]')).toHaveCount(1)
})

test('arrow keys and Enter select a drill row', async ({ page }) => {
  await open(page, 'reference-drill-columns--light')
  const causes = page.getByRole('figure', { name: 'Leakage by cause' })
  await causes.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('drill-selected')).toHaveText('Selected cause: Material variance')
})

test('comparison rows announce plan, actual and difference', async ({ page }) => {
  await open(page, 'reference-estimate-vs-actual--light')
  const chart = page.getByRole('figure', { name: 'Estimate vs actual by cost line' })
  await chart.focus()
  await page.keyboard.press('ArrowDown')
  await expect(chart.locator('[aria-live]')).toHaveText('Labor, plan $640, actual $1,060, +$420')
})

test('the waterfall announces running totals', async ({ page }) => {
  await open(page, 'reference-why-it-is-under-target--light')
  const chart = page.getByRole('figure', { name: 'Why margin is under target' })
  await chart.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(chart.locator('[aria-live]')).toHaveText(
    'Labor overruns, −1.6 pts · $7.7K, running total 36.4%',
  )
})

test('the bridge pins its callout and hands over to the tooltip on hover', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await open(page, 'reference-profit-bridge--light')
  const callout = page.locator('[data-ch-part="callout"]')
  await expect(callout).toContainText('$400')
  await page.locator('[data-ch-part="bar-hit"]').nth(1).hover()
  await expect(callout).toHaveCount(0)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('After discount')
})
