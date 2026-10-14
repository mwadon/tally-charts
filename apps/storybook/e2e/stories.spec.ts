import AxeBuilder from '@axe-core/playwright'
import { expect, type Page, test } from '@playwright/test'

const STORIES = [
  'reference-last-12-weeks--light',
  'reference-last-12-weeks--dark',
  'primitives-legend--default',
]

async function open(page: Page, id: string) {
  await page.goto(`/iframe.html?id=${id}&viewMode=story`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part="legend"]')
    .first()
    .waitFor()
}

for (const id of STORIES) {
  test(`${id} matches its screenshot`, async ({ page }) => {
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
