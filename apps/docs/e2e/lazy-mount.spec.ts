import { expect, test } from '@playwright/test'

test.describe('/docs/line-chart, 1280×800', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('the first card has its chart at once, the last mounts on scroll without changing height', async ({
    page,
  }) => {
    await page.goto('/docs/line-chart')
    const cards = page.locator('.chart-example')
    const first = cards.first()
    const last = cards.last()
    expect(await cards.count()).toBeGreaterThan(1)

    await expect(first.getByRole('application')).toHaveCount(1)
    await expect(first.getByRole('application').locator('svg')).toBeVisible()
    await expect(first.locator('[data-lazy-placeholder]')).toHaveCount(0)
    await expect(last.getByRole('application')).toHaveCount(0)
    await expect(last.locator('[data-lazy-placeholder]:visible')).toHaveCount(1)

    const before = await last.boundingBox()
    await last.scrollIntoViewIfNeeded()
    await expect(last.getByRole('application')).toHaveCount(1)
    await expect(last.getByRole('application')).toBeVisible()
    await expect(last.locator('[data-lazy-placeholder]')).toHaveCount(0)
    // Let the chart settle (fonts, the first measure) before measuring the card.
    await page.evaluate(() => document.fonts.ready)
    const after = await last.boundingBox()

    expect(before).not.toBeNull()
    expect(after).not.toBeNull()
    expect(Math.abs((after?.height ?? 0) - (before?.height ?? 0))).toBeLessThanOrEqual(1)
  })
})

test.describe('/, 375×812', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('the hero chart is there at once, the last gallery tile mounts on scroll', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.locator('.hero').getByRole('application', { name: 'Margin by week, last 6 weeks' }),
    ).toBeVisible()
    expect(await page.locator('.hero [data-lazy-placeholder]').count()).toBe(0)

    const tile = page.locator('.gallery-tile').last()
    await expect(tile.getByRole('application')).toHaveCount(0)
    await expect(tile.locator('[data-lazy-placeholder]')).toHaveCount(1)

    await tile.scrollIntoViewIfNeeded()
    await expect(tile.getByRole('application').first()).toBeVisible()
    await expect(tile.locator('[data-lazy-placeholder]')).toHaveCount(0)
  })
})
