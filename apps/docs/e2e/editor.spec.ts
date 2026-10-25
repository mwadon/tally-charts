import { readFileSync } from 'node:fs'
import path from 'node:path'
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

// The glökki iframe adds `_editorOrigin` and sends the tree. Opened as the top window with its own
// origin, the page is its own parent and receives that message from the test.
test('in SDK editor mode the blocks sent by the parent are wrapped in data-block-id', async ({
  page,
  baseURL,
}) => {
  const errors = collectErrors(page)
  const fixture = path.join(import.meta.dirname, '..', 'content', 'line-chart.json')
  const tree = JSON.parse(readFileSync(fixture, 'utf8')).componentTree as { id: string }[]
  await page.goto(`/docs/line-chart?_editor=1&_editorOrigin=${encodeURIComponent(baseURL ?? '')}`)
  await expect(page.getByRole('heading', { level: 1, name: 'LineChart' })).toBeVisible()
  await expect(page.locator(copyButtons)).toHaveCount(0)

  const message = createMessage('tree:update', {
    componentTree: tree,
    selectedBlockId: null,
    viewport: 'desktop',
  })
  await page.evaluate((data) => window.postMessage(data, window.location.origin), message)

  await expect(page.getByRole('application', { name: CHART })).toBeVisible()
  await expect(page.locator('h2#props')).toBeVisible()
  await expect(page.locator('[data-block-id]')).toHaveCount(tree.length)
  expect(errors).toEqual([])
})
