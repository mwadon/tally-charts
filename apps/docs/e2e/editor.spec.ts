import { createMessage } from '@glokki-cms/sdk'
import { expect, test } from '@playwright/test'
import { collectErrors } from './support'

const CHART = 'Monthly revenue, actual and forecast'
const copyButtons = '.code-block-bar button'

test('?_editor=1 shows the page through the editor canvas, without errors', async ({ page }) => {
  const errors = collectErrors(page)
  await page.goto('/docs/line-chart?_editor=1')

  await expect(page.getByRole('heading', { level: 1, name: 'LineChart' })).toBeVisible()
  // The server renders copy buttons; the editor's simplified code blocks have none, so zero
  // buttons means the canvas replaced the server content.
  await expect(page.locator(copyButtons)).toHaveCount(0)
  await expect(page.getByRole('application', { name: CHART })).toBeVisible()
  await expect(page.locator('h2#props')).toBeVisible()
  await expect(page.locator('.block-error')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('/?_editor=1 shows the home blocks through the editor canvas, without errors', async ({
  page,
}) => {
  const errors = collectErrors(page)
  await page.goto('/?_editor=1')

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Opinionated React charts for narrative business dashboards.',
    }),
  ).toBeVisible()
  await expect(page.locator('.block-error')).toHaveCount(0)
  const charts = page.locator('.gallery').getByRole('application')
  await expect(charts.first()).toBeVisible()
  expect(await charts.count()).toBeGreaterThanOrEqual(9)
  expect(errors).toEqual([])
})

test('without ?_editor=1 the server content stays and nothing is wrapped as a block', async ({
  page,
}) => {
  await page.goto('/docs/line-chart')

  await expect(page.getByRole('application', { name: CHART })).toBeVisible()
  await expect(page.locator(copyButtons).first()).toBeVisible()
  await expect(page.locator('[data-block-id]')).toHaveCount(0)
})

// The glokki iframe adds `_editorOrigin`, and the SDK then renders the tree that origin posts. The
// origin comes from the URL, so it counts only when it is in NEXT_PUBLIC_CMS_EDITOR_ORIGIN, which
// this build (like production today) does not set: whatever the URL names, the page keeps the
// server content and ignores the message. Opened as the top window the page is its own parent,
// so the test can post from the very origin the URL names. The allowed case, where the posted
// blocks are rendered and wrapped in data-block-id, is covered by editor-switch.test.tsx: it needs
// the variable at build time.
for (const origin of ['own', 'https://evil.example'] as const) {
  test(`_editorOrigin (${origin}) outside the allowlist does not let a message replace the page`, async ({
    page,
    baseURL,
  }) => {
    const errors = collectErrors(page)
    const named = origin === 'own' ? new URL(baseURL ?? '').origin : origin
    await page.goto(`/docs/line-chart?_editor=1&_editorOrigin=${encodeURIComponent(named)}`)
    await expect(page.getByRole('heading', { level: 1, name: 'LineChart' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const message = createMessage('tree:update', {
      componentTree: [{ id: 'x', type: 'prose', props: { markdown: 'INJECTED BY THE FRAME' } }],
      selectedBlockId: null,
      viewport: 'desktop',
    })
    await page.evaluate((data) => window.postMessage(data, '*'), message)
    // Long enough for the editor chunk to load and render, if it were going to.
    await page.waitForTimeout(1500)

    await expect(page.getByText('INJECTED BY THE FRAME')).toHaveCount(0)
    await expect(page.locator('[data-block-id]')).toHaveCount(0)
    await expect(page.locator(copyButtons).first()).toBeVisible()
    await expect(page.getByRole('application', { name: CHART })).toBeVisible()
    expect(errors).toEqual([])
  })
}
