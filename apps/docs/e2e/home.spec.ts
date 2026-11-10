import { readFileSync } from 'node:fs'
import path from 'node:path'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { collectErrors, tabTo, themeSuite } from './support'

interface Node {
  type: string
  props: { heading?: string }
}

const tree = (
  JSON.parse(
    readFileSync(path.join(import.meta.dirname, '..', 'content', 'home.json'), 'utf8'),
  ) as { componentTree: Node[] }
).componentTree

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

test('the sections follow home.json', async ({ page }) => {
  await page.goto('/')
  // The reference dashboards have h2 titles of their own; the block headings are the direct
  // children of the sections of main.
  await expect(page.locator('main > section > h2')).toHaveText(
    tree.flatMap((node) => (node.props.heading ? [node.props.heading] : [])),
  )
})

const dashboards = (
  tree.find((node) => node.type === 'gallery') as unknown as {
    props: { items: { label: string }[] }
  }
).props.items.map((item) => item.label)

// Narrow and wide layout of a dashboard (its panel is under and over 900 px), and widths between.
for (const width of [320, 375, 768, 1024, 1280]) {
  test.describe(`gallery, ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('every tab shows its live dashboard, which fits the panel', async ({ page }) => {
      const errors = collectErrors(page)
      await page.goto('/')
      const tabs = page.getByRole('tab')
      await expect(tabs).toHaveText(dashboards)
      for (let i = 0; i < dashboards.length; i++) {
        await tabs.nth(i).click()
        await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true')
        const panel = page.getByRole('tabpanel')
        await expect(panel).toHaveCount(1)
        await expect(panel).toHaveAccessibleName(dashboards[i] as string)
        await panel.scrollIntoViewIfNeeded()
        // A dashboard is charts (role application), a grid (Heatmap) or a list (RunwayChart).
        await expect(
          panel.locator('[role=application], [role=grid], [role=list]').first(),
        ).toBeVisible()
        const [scroll, client] = await panel.evaluate((el) => [el.scrollWidth, el.clientWidth])
        expect(scroll, dashboards[i]).toBeLessThanOrEqual((client ?? 0) + 1)
      }
      expect(errors).toEqual([])
    })
  })
}

test('the tabs work from the keyboard: arrows move the selection, Tab leaves the list', async ({
  page,
}) => {
  await page.goto('/')
  const tabs = page.getByRole('tab')
  await tabs.first().focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.nth(1)).toBeFocused()
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName(dashboards[1] as string)
  await page.keyboard.press('End')
  await expect(tabs.last()).toBeFocused()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).not.toBe('tab')
})

test('every dashboard tab has no axe violations, light and dark', async ({ page }) => {
  test.setTimeout(120_000)
  for (const theme of ['light', 'dark']) {
    await page.goto(`/?theme=${theme}`)
    const tabs = page.getByRole('tab')
    for (let i = 1; i < dashboards.length; i++) {
      await tabs.nth(i).click()
      const panel = page.getByRole('tabpanel')
      await panel.scrollIntoViewIfNeeded()
      await expect(
        panel.locator('[role=application], [role=grid], [role=list]').first(),
      ).toBeVisible()
      await page.waitForLoadState('networkidle')
      const results = await new AxeBuilder({ page })
        .include('#dashboards')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      expect(
        results.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        `${dashboards[i]}, ${theme}`,
      ).toEqual([])
    }
  }
})

// The chart index is a ruled list: one column on phones, two, then three.
for (const [width, expected] of [
  [320, 1],
  [375, 1],
  [768, 2],
  [1280, 3],
] as const) {
  test(`the chart index has ${expected} columns at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    const columns = await page
      .locator('.chart-index')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(expected)
  })
}

test('a chart tile leads to the page of its chart', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /^WaterfallChart/ }).click()
  await expect(page).toHaveURL(/\/docs\/waterfall-chart$/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the header links jump to the Charts and Dashboards sections', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  const header = page.getByRole('banner').first()
  await header.getByRole('link', { name: 'Dashboards' }).click()
  await expect(page).toHaveURL(/#dashboards$/)
  await expect(page.locator('#dashboards h2').first()).toBeInViewport()
  await header.getByRole('link', { name: 'Charts', exact: true }).click()
  await expect(page.locator('#charts h2')).toBeInViewport()
})

test('the header section links are hidden on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.locator('.header-anchor').first()).toBeHidden()
})

test('Copy in the hero says Copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const hero = page.locator('.hero-copy')
  await hero.getByRole('button', { name: 'Copy code: npm i tally-charts' }).click()

  await expect(hero.getByText('Copied').first()).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('npm i tally-charts')
})

test('/ has no console errors after scrolling to the footer', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page.getByRole('tab')).toHaveCount(9)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
