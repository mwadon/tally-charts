import { expect, test } from '@playwright/test'
import { SURFACE, tabTo } from './support'

const KEY = 'tally-docs-theme'

test('Tab reaches the theme switch with a visible outline; it starts on System', async ({
  page,
}) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: 'Theme' })
  await expect(select).toHaveValue('system')

  const outline = await tabTo(page, 'select[aria-label="Theme"]')
  expect(outline.style).toBe('solid')
  expect(outline.width).toBeGreaterThan(0)
})

test('the chosen theme is on <html> and the body before hydration (Next JS blocked)', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-ch-theme', 'dark')
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark')

  await page.route('**/_next/static/**/*.js', (route) => route.abort())
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-ch-theme', 'dark')
  await expect(page.locator('body')).toHaveCSS('background-color', SURFACE.dark)
})

test('the first <body> already has the stored theme (MutationObserver)', async ({ page }) => {
  await page.addInitScript(() => {
    const seen: { theme: string | null } = { theme: 'unset' }
    ;(window as unknown as { __seen: typeof seen }).__seen = seen
    const observer = new MutationObserver(() => {
      if (document.body) {
        seen.theme = document.documentElement.getAttribute('data-ch-theme')
        observer.disconnect()
      }
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark')
  await page.reload()
  const seen = await page.evaluate(
    () => (window as unknown as { __seen: { theme: string | null } }).__seen,
  )
  expect(seen.theme).toBe('dark')
})

test('the choice survives navigating to another page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark')
  await page.getByRole('banner').getByRole('link', { name: 'Docs', exact: true }).click()
  await expect(page).toHaveURL(/\/docs\/line-chart$/)

  await expect(page.locator('html')).toHaveAttribute('data-ch-theme', 'dark')
  await expect(page.locator('body')).toHaveCSS('background-color', SURFACE.dark)
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('dark')
})

test('System removes the attribute and the stored key, also after a reload', async ({ page }) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: 'Theme' })
  await select.selectOption('dark')
  await select.selectOption('system')
  await page.reload()

  await expect(page.locator('html')).not.toHaveAttribute('data-ch-theme', /.*/)
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull()
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('system')
})

test('?theme=light beats a stored dark and does not overwrite it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('combobox', { name: 'Theme' }).selectOption('dark')

  await page.goto('/?theme=light')
  await expect(page.locator('html')).toHaveAttribute('data-ch-theme', 'light')
  await expect(page.getByRole('combobox', { name: 'Theme' })).toHaveValue('light')
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBe('dark')
})
