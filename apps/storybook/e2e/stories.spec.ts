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

test('the grouped bar chart walks bars group by group and announces the series', async ({
  page,
}) => {
  await open(page, 'charts-groupedbarchart--light')
  const chart = page.getByRole('figure', { name: 'Jobs completed by crew, per quarter' })
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  await expect(chart.locator('[aria-live]')).toHaveText('North, 1 of 4, Q1, 42')
  await page.keyboard.press('ArrowRight')
  await expect(chart.locator('[aria-live]')).toHaveText('South, 1 of 4, Q1, 35')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('South')
})

test('the stacked bar chart walks segments up each stack, then on to the next', async ({
  page,
}) => {
  await open(page, 'charts-stackedbarchart--light')
  const chart = page.getByRole('figure', { name: 'Monthly job cost against the $60k budget' })
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  await expect(live).toHaveText('Labor, 1 of 6, Jan, $24k')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('Materials, 1 of 6, Jan, $18k')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('Subcontract, 1 of 6, Jan, $9k')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('Labor, 2 of 6, Feb, $26k')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Labor')
})

test('the stacked area chart walks the weeks and announces the stack with its total', async ({
  page,
}) => {
  await open(page, 'charts-stackedareachart--light')
  const chart = page.getByRole('figure', { name: 'Crew hours per week, booked from W10' })
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  // Focusing the plot announces the first week; ArrowRight then moves to the second.
  await expect(live).toHaveText(
    '1 of 12, W1, 60 h Warranty, 120 h Service, 180 h Install, 360 h Total',
  )
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText(
    '2 of 12, W2, 55 h Warranty, 125 h Service, 190 h Install, 370 h Total',
  )
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Total')
})

test('the scatter chart walks the jobs by estimate and announces every measure', async ({
  page,
}) => {
  await open(page, 'charts-scatterchart--light')
  const chart = page.getByRole('figure', { name: 'Margin by job size' })
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  await expect(live).toHaveText('1 of 16, Alder Court, Estimate $8K, Margin 44%, Hours 40 h')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('2 of 16, Birch Lane, Estimate $12K, Margin 38%, Hours 58 h')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Birch Lane')
})

test('the funnel chart walks its steps and announces the continue rate', async ({ page }) => {
  await open(page, 'charts-funnelchart--light')
  const chart = page.getByRole('figure', { name: 'From lead to paid job' })
  await expect(chart.locator('[data-ch-orientation="horizontal"]')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  await expect(live).toHaveText('1 of 5, Leads, 1,240')
  const activeGuide = chart.locator('[data-ch-part="funnel-guide"][data-ch-active="true"]')
  await expect(activeGuide).toHaveCount(1)
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('2 of 5, Site visits, 806, 65% of previous step')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Site visits')
  // The active guide moved off the plot edge to the second step line.
  await expect(activeGuide).toHaveCount(1)
  const x = Number(await activeGuide.getAttribute('x1'))
  expect(x).toBeGreaterThan(100)
})

test('the donut chart walks its slices and announces the share of the total', async ({ page }) => {
  await open(page, 'charts-donutchart--light')
  const chart = page.getByRole('figure', { name: 'Revenue by service line' })
  await expect(chart.locator('[data-ch-layout="right"]')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  const slices = chart.locator('[data-ch-part="donut-slice"]')
  const activeRow = chart.locator('[data-ch-part="donut-row"][data-ch-active="true"]')
  await expect(live).toHaveText('1 of 5, Installs, $773K, 42% of total')
  await expect(slices).toHaveCount(5)
  await expect(chart.locator('[data-ch-part="donut-slice"][data-ch-dimmed="true"]')).toHaveCount(4)
  await expect(slices.nth(0)).not.toHaveAttribute('data-ch-dimmed', 'true')
  await expect(activeRow).toContainText('Installs')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText('2 of 5, Service plans, $442K, 24% of total')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('Service plans')
  await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('24% of total')
  await expect(activeRow).toContainText('Service plans')
  await page.keyboard.press('ArrowDown')
  await expect(live).toHaveText('3 of 5, Repairs, $294K, 16% of total')
  await page.keyboard.press('End')
  await expect(live).toHaveText('5 of 5, Other, $147K, 8% of total')
  await expect(slices.nth(4)).not.toHaveAttribute('data-ch-dimmed', 'true')
  await page.keyboard.press('ArrowLeft')
  await expect(live).toHaveText('4 of 5, Inspections, $184K, 10% of total')
  await page.keyboard.press('Home')
  await expect(live).toHaveText('1 of 5, Installs, $773K, 42% of total')
})

test('hovering a donut slice or its list row activates it; the hole clears it', async ({
  page,
}) => {
  await open(page, 'charts-donutchart--light')
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  const dimmed = page.locator('[data-ch-part="donut-slice"][data-ch-dimmed="true"]')
  const slices = page.locator('[data-ch-part="donut-slice"]')
  const ring = await page.locator('[data-ch-part="donut-ring"]').boundingBox()
  if (!ring) throw new Error('no ring')
  const cx = ring.x + ring.width / 2
  const cy = ring.y + ring.height / 2
  // Mid-ring, at an angle from 12 o'clock clockwise.
  const at = (degrees: number) => {
    const r = (ring.width / 2) * 0.82
    const a = (degrees * Math.PI) / 180
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)] as const
  }
  // Repairs runs from 66% to 82% of the ring: 9 o'clock is inside it.
  await page.mouse.move(...at(266))
  await expect(tooltip).toContainText('Repairs')
  await expect(dimmed).toHaveCount(4)
  await expect(slices.nth(2)).not.toHaveAttribute('data-ch-dimmed', 'true')
  // Into the hole: the hover ends.
  await page.mouse.move(cx, cy)
  await expect(tooltip).toHaveCount(0)
  await expect(dimmed).toHaveCount(0)
  // A list row activates its slice.
  await page.locator('[data-ch-part="donut-hit"]').nth(3).hover()
  await expect(tooltip).toContainText('Inspections')
  await expect(dimmed).toHaveCount(4)
  await expect(slices.nth(3)).not.toHaveAttribute('data-ch-dimmed', 'true')
  await expect(page.locator('[data-ch-part="donut-row"][data-ch-active="true"]')).toContainText(
    'Inspections',
  )
  // From the row into the hole clears it too.
  await page.mouse.move(cx, cy)
  await expect(tooltip).toHaveCount(0)
  await expect(dimmed).toHaveCount(0)
})

test('the gantt chart walks its rows in drawn order and announces dates, days and status', async ({
  page,
}) => {
  await open(page, 'charts-ganttchart--light')
  const chart = page.getByRole('figure', { name: 'Kitchen remodel' })
  await expect(chart.locator('[data-ch-part="gantt"][data-ch-labels="left"]')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(chart.getByRole('application')).toBeFocused()
  const live = chart.locator('[aria-live]')
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  const activeRow = chart.locator('[data-ch-part="gantt-row"][data-ch-active="true"]')
  // 11 task bars and 2 milestones; with one task active the other ten bars are dimmed.
  const dimmedBars = chart.locator('[data-ch-part="gantt-bar"][data-ch-dimmed="true"]')
  await expect(live).toHaveText('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
  await expect(activeRow).toHaveCount(1)
  await expect(activeRow).toContainText('Site protection')
  await expect(chart.locator('[data-ch-part="gantt-bar"]')).toHaveCount(11)
  await expect(dimmedBars).toHaveCount(10)
  await page.keyboard.press('ArrowDown')
  await expect(live).toHaveText(
    '2 of 13, Demolition, Mar 4 – Mar 9, 5 days, done, 1 day over baseline',
  )
  await expect(tooltip).toContainText('Demolition')
  await expect(tooltip).toContainText('1 day over baseline')
  await expect(activeRow).toContainText('Demolition')
  await page.keyboard.press('ArrowUp')
  await expect(live).toHaveText('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
  await page.keyboard.press('ArrowRight')
  await expect(live).toHaveText(
    '2 of 13, Demolition, Mar 4 – Mar 9, 5 days, done, 1 day over baseline',
  )
  await page.keyboard.press('ArrowLeft')
  await expect(live).toHaveText('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
  await page.keyboard.press('End')
  await expect(live).toHaveText(
    '13 of 13, Final walkthrough, milestone, Apr 17, upcoming, 3 days late',
  )
  await expect(activeRow).toContainText('Final walkthrough')
  // A milestone is active: every task bar is dimmed.
  await expect(dimmedBars).toHaveCount(11)
  await page.keyboard.press('ArrowUp')
  await expect(live).toHaveText(
    '12 of 13, Fixtures and appliances, Apr 12 – Apr 16, 4 days, planned',
  )
  await page.keyboard.press('Home')
  await expect(live).toHaveText('1 of 13, Site protection, Mar 2 – Mar 4, 2 days, done')
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowDown')
  await expect(live).toHaveText(
    '5 of 13, Plumbing rough-in, Mar 14 – Mar 21, 7 days, done, 2 days over baseline',
  )
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(live).toHaveText(
    '7 of 13, Rough inspection, milestone, Mar 23, reached, 3 days late',
  )
  await page.keyboard.press('ArrowDown')
  await expect(live).toHaveText(
    '8 of 13, Drywall and paint, Mar 23 – Mar 31, 8 days, in progress, 50%',
  )
  await expect(tooltip).toContainText('50% done')
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
})

test('hovering a gantt row name or its bar shows that row; off the chart the hover ends', async ({
  page,
}) => {
  await open(page, 'charts-ganttchart--light')
  const tooltip = page.locator('[data-ch-part="tooltip"]')
  const row = page.locator('[data-ch-part="gantt-row"]').filter({ hasText: 'Plumbing rough-in' })
  await expect(row).toHaveCount(1)
  const centre = async (part: string) => {
    const box = await row.locator(`[data-ch-part="${part}"]`).boundingBox()
    if (!box) throw new Error(`no ${part}`)
    return [box.x + box.width / 2, box.y + box.height / 2] as const
  }
  const name = await centre('gantt-name')
  const bar = await centre('gantt-bar')
  // The name and the bar are apart: names sit in the label column left of the plot.
  expect(bar[0] - name[0]).toBeGreaterThan(100)
  const activeRow = page.locator('[data-ch-part="gantt-row"][data-ch-active="true"]')
  for (const at of [name, bar]) {
    await page.mouse.move(...at)
    await expect(tooltip).toContainText('Plumbing rough-in')
    await expect(tooltip).toContainText('2 days over baseline')
    await expect(activeRow).toContainText('Plumbing rough-in')
    await expect(page.locator('[data-ch-part="gantt-bar"][data-ch-dimmed="true"]')).toHaveCount(10)
    // Off the chart, into the page's margin: the hover ends.
    await page.mouse.move(4, 4)
    await expect(tooltip).toHaveCount(0)
    await expect(activeRow).toHaveCount(0)
  }
})

test('the treemap names its listbox, groups and tiles', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 })
  await open(page, 'charts-treemap--light')
  const box = page.getByRole('listbox', { name: 'Revenue by service line', exact: true })
  await expect(box).toHaveAccessibleDescription(
    'Remodels bring in just over half of revenue; whole-home remodels run at an 8% margin.',
  )
  await expect(box.getByRole('group')).toHaveCount(4)
  await expect(box.getByRole('option')).toHaveCount(13)
  for (const [name, count] of [
    ['Remodels $942K', 4],
    ['Repairs $480K', 4],
    ['Outdoor $294K', 3],
    ['Maintenance plans $124K', 2],
  ] as const) {
    await expect(box.getByRole('group', { name, exact: true }).getByRole('option')).toHaveCount(
      count,
    )
  }
  await expect(
    box.getByRole('group', { name: 'Repairs $480K', exact: true }).getByRole('option').nth(3),
  ).toHaveAccessibleName('Handyman, $54K, 2.9% of total, gross margin 18%, 10% to 20%')
})

test('the treemap walks its tiles with the arrow keys, Home and End, and Escape clears', async ({
  page,
}) => {
  // The artboard: the chart 1024 × 480. Remodels on the left (Kitchen a full-height column, Bath
  // over Basement and Whole-home), then Repairs (Plumbing over Electrical over Roofing and
  // Handyman), then Outdoor over Maintenance plans.
  await page.setViewportSize({ width: 1280, height: 760 })
  await open(page, 'charts-treemap--light')
  const box = page.getByRole('listbox', { name: 'Revenue by service line', exact: true })
  const focused = box.locator('[role="option"]:focus')
  const tooltip = page.locator('[data-ch-part="treemap-tooltip"]')
  const active = box.locator('[data-ch-part="treemap-tile"][data-ch-active="true"]')
  // One tab stop for the whole box.
  await expect(box.locator('[role="option"][tabindex="0"]')).toHaveCount(1)
  await page.keyboard.press('Tab')
  await expect(focused).toHaveAccessibleName(
    'Kitchen, $412K, 22.4% of total, gross margin 34%, 30% to 40%',
  )
  await expect(active).toHaveCount(1)
  await expect(tooltip.locator('[data-ch-part="pill-segment"]')).toHaveText([
    'Kitchen',
    '$412K',
    '22.4% of total',
    'Gross margin 34%',
  ])
  // Kitchen is the top-left tile: up and left keep the focus where it is.
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowLeft')
  await expect(focused).toHaveAccessibleName(/^Kitchen, /)
  const steps = [
    ['ArrowRight', 'Bath, $286K, 15.5% of total, gross margin 31%, 30% to 40%'],
    ['ArrowDown', 'Basement, $148K, 8.0% of total, gross margin 22%, 20% to 30%'],
    ['ArrowRight', 'Whole-home, $96K, 5.2% of total, gross margin 8%, Under 10%'],
    ['ArrowRight', 'Roofing, $96K, 5.2% of total, gross margin 16%, 10% to 20%'],
    ['ArrowUp', 'Electrical, $142K, 7.7% of total, gross margin 38%, 30% to 40%'],
    ['ArrowUp', 'Plumbing, $188K, 10.2% of total, gross margin 42%, 40% and up'],
    ['ArrowLeft', 'Bath, $286K, 15.5% of total, gross margin 31%, 30% to 40%'],
    ['ArrowLeft', 'Kitchen, $412K, 22.4% of total, gross margin 34%, 30% to 40%'],
    ['End', 'Seasonal, $38K, 2.1% of total, gross margin 41%, 40% and up'],
    ['Home', 'Kitchen, $412K, 22.4% of total, gross margin 34%, 30% to 40%'],
  ] as const
  for (const [key, name] of steps) {
    await page.keyboard.press(key)
    await expect(focused).toHaveAccessibleName(name)
    // The roving tab stop follows the focus, and the focused tile is the active one.
    await expect(box.locator('[role="option"][tabindex="0"]')).toHaveAccessibleName(name)
    await expect(active).toHaveAccessibleName(name)
  }
  await page.keyboard.press('End')
  await expect(tooltip.locator('[data-ch-part="pill-segment"]')).toHaveText([
    'Seasonal',
    '$38K',
    '2.1% of total',
    'Gross margin 41%',
  ])
  // Escape clears the active tile and its tooltip; the focus stays on the tile.
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
  await expect(active).toHaveCount(0)
  await expect(focused).toHaveAccessibleName(
    'Seasonal, $38K, 2.1% of total, gross margin 41%, 40% and up',
  )
})

test('hovering a treemap tile shows its tooltip, and Escape closes it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 760 })
  await open(page, 'charts-treemap--light')
  const tooltip = page.locator('[data-ch-part="treemap-tooltip"]')
  await page.getByRole('option', { name: /^Plumbing, / }).hover()
  await expect(tooltip).toContainText('Plumbing')
  await expect(tooltip).toContainText('10.2% of total')
  // Plumbing sits right under its group header at the top of the box: no room for the pill
  // above it, so the pill goes below it, inside the box.
  const pill = await tooltip.boundingBox()
  const tile = await page.getByRole('option', { name: /^Plumbing, / }).boundingBox()
  const plot = await page.locator('[data-ch-part="treemap-plot"]').boundingBox()
  if (!pill || !tile || !plot) throw new Error('no pill, tile or plot')
  expect(tile.y - plot.y).toBeCloseTo(24, 0)
  expect(tile.y - plot.y).toBeLessThan(pill.height + 6)
  expect(pill.y).toBeGreaterThan(tile.y + tile.height)
  expect(pill.y + pill.height).toBeLessThanOrEqual(plot.y + plot.height + 0.5)
  expect(pill.x).toBeGreaterThanOrEqual(plot.x)
  expect(pill.x + pill.width).toBeLessThanOrEqual(plot.x + plot.width + 0.5)
  // Nothing has focus: Escape still closes the hover tooltip.
  await expect(page.locator('[role="option"]:focus')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(tooltip).toHaveCount(0)
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

test.describe('dual axis traffic', () => {
  test('the arrow keys announce both series, and the tooltip shows both', async ({ page }) => {
    await open(page, 'reference-traffic-dual-axis--light')
    const chart = page.locator('[data-ch-root]')
    await page.keyboard.press('Tab')
    await expect(chart.getByRole('application')).toBeFocused()
    const live = chart.locator('[aria-live]')
    await expect(live).toHaveText('1 of 14, Oct 18, 540 views, 260 unique visitors')
    await expect(page.locator('[data-ch-part="tooltip"]')).toContainText('260 unique')
    await page.keyboard.press('ArrowRight')
    await expect(live).toHaveText('2 of 14, Oct 19, 610 views, 300 unique visitors')
    await page.keyboard.press('End')
    await expect(live).toHaveText('14 of 14, Oct 31, 920 views, 440 unique visitors')
  })

  test('the data table has a column for each series', async ({ page }) => {
    await open(page, 'reference-traffic-dual-axis--light')
    const table = page.locator('[data-ch-root] table')
    await expect(table.locator('thead th')).toHaveText(['Day', 'Views', 'Unique visitors'])
    await expect(table.locator('tbody tr')).toHaveCount(14)
    await expect(table.locator('tbody tr').nth(6)).toContainText('1040')
  })

  test('both value axes label their own scale', async ({ page }) => {
    await open(page, 'reference-traffic-dual-axis--light')
    const labels = (side: string) =>
      page.locator(`[data-ch-part="axis"][data-ch-side="${side}"] [data-ch-part="axis-label"]`)
    await expect(labels('left')).toHaveText(['0', '200', '400', '600', '800', '1,000', '1,200'])
    await expect(labels('right')).toHaveText(['0', '100', '200', '300', '400', '500', '600'])
  })
})
