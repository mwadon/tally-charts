import { expect, test } from '@playwright/test'
import { open } from './stories'

const STORY = 'primitives-small-pieces--small-bars'

test('InlineBar width="100%" fills a 200px table cell', async ({ page }) => {
  await open(page, STORY)
  const bar = await page.locator('[data-ch-part="inline-bar"]').boundingBox()
  expect(bar?.width).toBeGreaterThanOrEqual(150)
  expect(bar?.width).toBeLessThanOrEqual(200)
})

// The recipe from the small-pieces docs page: a stylesheet loaded after the theme sets the height
// of the public parts. The fill follows the track, and the target tick stays visible.
test('a later stylesheet slims the bar and the meter track to 4px', async ({ page }) => {
  await open(page, STORY)
  await page.addStyleTag({
    content: '[data-ch-part="inline-bar"], [data-ch-part="meter-track"] { height: 4px }',
  })
  for (const part of ['inline-bar', 'meter-track']) {
    const track = page.locator(`[data-ch-part="${part}"]`)
    const fill = page.locator(
      `[data-ch-part="${part === 'inline-bar' ? 'inline-bar-fill' : 'meter-fill'}"]`,
    )
    const tick = page.locator(
      `[data-ch-part="${part === 'inline-bar' ? 'inline-bar-target' : 'meter-target'}"]`,
    )
    expect((await track.boundingBox())?.height).toBeCloseTo(4, 1)
    expect((await fill.boundingBox())?.height).toBeCloseTo(4, 1)
    const t = await tick.boundingBox()
    expect(t?.width).toBeGreaterThan(0)
    expect(t?.height).toBeGreaterThan(4)
    await expect(tick).toBeVisible()
  }
})
