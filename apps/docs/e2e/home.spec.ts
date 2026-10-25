import { readFileSync } from 'node:fs'
import path from 'node:path'
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

// One width from every column-count band of the gallery, including the tablet range.
for (const width of [320, 375, 640, 768, 900, 1024, 1280]) {
  test.describe(`gallery, ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } })

    test('shows nine live dashboards that fit their tiles', async ({ page }) => {
      await page.goto('/')
      const tiles = page.locator('.gallery-tile')
      await expect(tiles).toHaveCount(9)
      for (let i = 0; i < 9; i++) {
        const tile = tiles.nth(i)
        await tile.scrollIntoViewIfNeeded()
        await expect(tile.getByRole('application').first()).toBeVisible()
        const [scroll, client] = await tile.evaluate((el) => [el.scrollWidth, el.clientWidth])
        expect(scroll, `tile ${i + 1}`).toBeLessThanOrEqual((client ?? 0) + 1)
      }
    })
  })
}

// Columns follow the width (tile of at least 22rem): 1 on phones and narrow tablets, 2, then 3.
for (const [width, expected] of [
  [375, 1],
  [640, 1],
  [768, 2],
  [1280, 3],
] as const) {
  test(`the gallery has ${expected} column(s) at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    const columns = await page
      .locator('.gallery')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(columns).toBe(expected)
  })
}

test('Copy in the Install section says Copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const install = page
    .locator('main > section')
    .filter({ has: page.getByRole('heading', { level: 2, name: 'Install' }) })
  const button = install.getByRole('button', { name: /^Copy code/ })
  await button.scrollIntoViewIfNeeded()
  await button.click()

  await expect(install.getByText('Copied').first()).toBeVisible()
})

test('/ has no console errors after scrolling to the footer', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page.locator('.gallery-tile')).toHaveCount(9)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})
