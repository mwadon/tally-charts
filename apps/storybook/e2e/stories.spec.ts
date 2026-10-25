import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { channels, contrastOf, open, STORIES, THEMELESS, VIEWPORTS } from './stories'

for (const id of STORIES) {
  test(`${id} matches its screenshot`, async ({ page }) => {
    const viewport = VIEWPORTS[id]
    if (viewport) await page.setViewportSize(viewport)
    await open(page, id)
    await expect(page).toHaveScreenshot(`${id}.png`, { fullPage: true })
  })
}

for (const id of [...STORIES, 'reference-last-12-weeks--selectable']) {
  for (const theme of THEMELESS.has(id) ? (['light', 'dark'] as const) : [undefined]) {
    test(`${id}${theme ? ` (${theme})` : ''} has no axe violations`, async ({ page }) => {
      await open(page, id, theme)
      const results = await new AxeBuilder({ page })
        .include('#storybook-root')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze()
      expect(results.violations).toEqual([])
    })
  }
}

test('keyboard focus shows the first point, and the keys move and announce it', async ({
  page,
}) => {
  await open(page, 'reference-last-12-weeks--light')
  const chart = page.locator('[data-ch-root]')
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 6')
  await expect(chart.locator('[aria-live]')).toHaveText('1 of 12, Jul 6, 37.5%')
  await page.keyboard.press('End')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Sep 21')
  await expect(chart.locator('[aria-live]')).toHaveText('12 of 12, Sep 21, 34.0%')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})

test('hovering a bar dims the others', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  await page.locator('[data-ch-part="bar-hit"]').nth(3).hover()
  await expect(page.locator('[data-ch-part="bar"][data-ch-dimmed="true"]')).toHaveCount(11)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 27')
})

test('Escape closes a hover tooltip', async ({ page }) => {
  await open(page, 'reference-last-12-weeks--light')
  await page.locator('[data-ch-part="bar-hit"]').nth(3).hover()
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Jul 27')
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-ch-part="tooltip"]')).toHaveCount(0)
})

test('the pointer can move onto a hover tooltip without closing it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-dallas-installs--light')
  const dot = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!dot) throw new Error('no dot')
  await page.mouse.move(dot.x + dot.width / 2, dot.y + dot.height / 2)
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  await expect(tooltip).toContainText('Estimated')
  const tip = await tooltip.boundingBox()
  if (!tip) throw new Error('no tooltip')
  await page.mouse.move(tip.x + tip.width / 2, tip.y + tip.height / 2, { steps: 8 })
  await expect(tooltip).toContainText('Estimated')
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
  // Focus activates the first row; one step down is the second.
  await causes.getByRole('application').focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('drill-selected')).toHaveText('Selected cause: Material variance')
})

test('comparison rows announce plan, actual and difference', async ({ page }) => {
  await open(page, 'reference-estimate-vs-actual--light')
  const chart = page.getByRole('figure', { name: 'Estimate vs actual by cost line' })
  await chart.getByRole('application').focus()
  await expect(chart.locator('[aria-live]')).toHaveText(
    '1 of 6, Labor, plan $640, actual $1,060, +$420',
  )
})

test('the waterfall announces running totals', async ({ page }) => {
  await open(page, 'reference-why-it-is-under-target--light')
  const chart = page.getByRole('figure', { name: 'Why margin is under target' })
  await chart.getByRole('application').focus()
  await page.keyboard.press('ArrowDown')
  await expect(chart.locator('[aria-live]')).toHaveText(
    '2 of 7, Labor overruns, −1.6 pts · $7.7K, running total 36.4%',
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

test('the dot histogram walks bins with the arrow keys', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-jobs-by-margin--light')
  const chart = page.getByRole('figure', { name: 'Jobs by margin this week' })
  await chart.getByRole('application').focus()
  await expect(chart.locator('[aria-live]')).toHaveText('Critical, 1 of 6, #5600, 3.1%')
  await page.keyboard.press('ArrowRight')
  await expect(chart.locator('[aria-live]')).toHaveText('Critical, 2 of 6, #5601, 4.2%')
})

test('hovering near a strip dot shows its tooltip', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-dallas-installs--light')
  const box = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2 + 2, box.y + box.height / 2)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Estimated')
})

test('the waffle pins its peak and hands over to the tooltip on hover', async ({ page }) => {
  await open(page, 'reference-profit-leaked--light')
  const callout = page.locator('[data-ch-part="callout"]')
  await expect(callout).toContainText('Sep 7')
  const box = await page.locator('[data-ch-part="dot"]').first().boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2, box.y - 20)
  await expect(callout).toHaveCount(0)
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Aug 3')
})

test('the waffle peak pill keeps a gap above its column', async ({ page }) => {
  await open(page, 'reference-profit-leaked--light')
  const pill = await page.locator('[data-ch-part="callout"]').boundingBox()
  if (!pill) throw new Error('no callout')
  const tops = await page
    .locator('[data-ch-part="dot"]')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top))
  expect(Math.min(...tops) - (pill.y + pill.height)).toBeGreaterThanOrEqual(8)
})

test('the line chart snaps to the nearest month and lists every series', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 })
  await open(page, 'reference-margin-outlook--light')
  // Hollow dots belong to the forecast: Sep (the join) first, then Oct.
  const box = await page
    .locator('[data-ch-part="line-dot"][data-ch-hollow="true"]')
    .nth(1)
    .boundingBox()
  if (!box) throw new Error('no dot')
  await page.mouse.move(box.x + box.width / 2 + 6, box.y + 40)
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  await expect(tooltip).toContainText('Oct')
  await expect(tooltip).toContainText('35.2%')
  await expect(tooltip).toContainText('on the current path')
  await expect(tooltip).toContainText('36.7%')
  await expect(page.locator('[data-ch-part="dot-ring"]')).toHaveCount(2)
})

test('the line chart announces every series at a month', async ({ page }) => {
  await open(page, 'reference-margin-outlook--light')
  const chart = page.getByRole('figure', { name: 'Margin outlook' })
  await chart.getByRole('application').focus()
  await page.keyboard.press('End')
  await expect(chart.locator('[aria-live]')).toHaveText(
    '9 of 9, Dec, 36.0% on the current path, 37.6% with changes',
  )
})

test('arrow keys move through the heatmap and Enter selects a cell', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 })
  await open(page, 'reference-where-it-leaks--light')
  await page.getByRole('gridcell', { name: '$14.8K' }).focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('gridcell', { name: '$5.1K' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('heatmap-selected')).toHaveText('Selected: Austin · Materials')
})

test('a time axis labels dates and the keyboard announces them', async ({ page }) => {
  await open(page, 'charts-time-axis--hourly-light')
  const chart = page.getByRole('figure', { name: 'Line load today' })
  await expect(chart.locator('[data-ch-part="axis-label"]').last()).toHaveText('Mar 3')
  await chart.getByRole('application').focus()
  await page.keyboard.press('End')
  await expect(chart.locator('[aria-live]')).toHaveText(
    '24 of 24, Mar 2, 11:00 PM, 43.0% Line load today',
  )
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Mar 2, 11:00 PM')
})

test('a monthly time axis shows years and announces months', async ({ page }) => {
  await open(page, 'charts-time-axis--monthly-light')
  const chart = page.getByRole('figure', { name: 'Revenue over five years' })
  await expect(
    chart.locator('[data-ch-part="axis-label"]').filter({ hasText: /^20\d\d$/ }),
  ).toHaveCount(6)
  await chart.getByRole('application').focus()
  await page.keyboard.press('Home')
  await expect(chart.locator('[aria-live]')).toHaveText(
    '1 of 60, Jan 2021, 365 Revenue over five years',
  )
})

for (const theme of ['light', 'dark']) {
  test(`every sequential ramp keeps its contrast in the browser (${theme})`, async ({ page }) => {
    // The system prefers the other scheme: the story's own data-ch-theme must still win.
    await page.emulateMedia({ colorScheme: theme === 'light' ? 'dark' : 'light' })
    await open(page, `primitives-sequential--${theme}`)
    const ramps = await page.evaluate(() =>
      [...document.querySelectorAll('[data-ch-part="heatmap"]')].map((heatmap) => ({
        surface: getComputedStyle(heatmap).getPropertyValue('--ch-surface').trim(),
        cells: [...heatmap.querySelectorAll('[data-ch-part="heatmap-cell"]')].map((cell) => ({
          bg: getComputedStyle(cell).backgroundColor,
          fg: getComputedStyle(cell).color,
        })),
        swatches: [...heatmap.querySelectorAll('[data-ch-part="legend-swatch"]')].map(
          (swatch) => getComputedStyle(swatch).backgroundColor,
        ),
      })),
    )
    expect(ramps).toHaveLength(6)
    // White text on the light theme's top level, dark text on the dark theme's.
    const topText = ramps[0]?.cells[4]?.fg ?? ''
    expect(channels(topText)[0]).toBe(theme === 'light' ? 255 : 18)
    for (const { surface, cells, swatches } of ramps) {
      expect(cells).toHaveLength(5)
      expect(swatches).toEqual(cells.map((cell) => cell.bg))
      for (const cell of cells) expect(contrastOf(cell.fg, cell.bg)).toBeGreaterThanOrEqual(4.5)
      for (let i = 1; i < 5; i++) {
        expect(contrastOf(cells[i - 1]?.bg ?? '', cells[i]?.bg ?? '')).toBeGreaterThanOrEqual(1.3)
      }
      expect(contrastOf(cells[4]?.bg ?? '', surface)).toBeGreaterThanOrEqual(3)
    }
  })
}

test('arrow keys and Enter select a runway row and update the detail panel', async ({ page }) => {
  await open(page, 'reference-usage-runway--light')
  const box = page.getByRole('listbox', { name: 'Usage runway' })
  await box.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await expect(box.getByRole('option', { selected: true })).toHaveAccessibleName(/^Team seat Max /)
  await expect(page.getByTestId('runway-detail-title')).toHaveText('Team seat Max')
})
