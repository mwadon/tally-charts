import { expect, test } from '@playwright/test'
import { themeSuite } from './support'

const FIRST = 'API quotas: which keys run out before they reset'
const SECOND = 'GPU hours per team, with the highlighted row controlled from outside'

themeSuite({
  name: 'runway-chart',
  path: '/docs/runway-chart',
  h1: 'RunwayChart',
  chart: FIRST,
  chartRole: 'list',
})

test('/docs/runway-chart is a page, and the sidebar links to it', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  const response = await page.goto('/docs/runway-chart')
  expect(response?.status()).toBe(200)

  await expect(page.getByRole('heading', { level: 1, name: 'RunwayChart' })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Documentation' })
  const link = nav.getByRole('link', { name: 'RunwayChart' })
  await expect(link).toHaveAttribute('href', '/docs/runway-chart')
  await expect(link).toHaveAttribute('aria-current', 'page')
  await expect(nav.locator('.nav-soon', { hasText: 'RunwayChart' })).toHaveCount(0)
})

test('/docs/runway-chart documents RunwayChart and runwayForecast once each', async ({ page }) => {
  await page.goto('/docs/runway-chart')

  await expect(page.getByRole('region', { name: 'Props of RunwayChart', exact: true })).toHaveCount(
    1,
  )
  await expect(
    page.getByRole('region', { name: 'Parameters of runwayForecast', exact: true }),
  ).toHaveCount(1)
})

test('the first example is a list, the second a listbox', async ({ page }) => {
  await page.goto('/docs/runway-chart')

  await expect(page.getByRole('list', { name: FIRST })).toBeVisible()
  await expect(page.getByRole('listbox', { name: SECOND })).toBeVisible()
})

test('a row reads as its label and status', async ({ page }) => {
  await page.goto('/docs/runway-chart')

  const rows = page.getByRole('list', { name: FIRST }).getByRole('listitem')
  await expect(rows).toHaveCount(6)
  await expect(rows.filter({ hasText: 'Reports export' })).toContainText('Runs out Wed 18:53')
})

test('a button outside the chart moves the active row', async ({ page }) => {
  await page.goto('/docs/runway-chart')

  const listbox = page.getByRole('listbox', { name: SECOND })
  const status = page.getByText(/^Active: /)
  await expect(status).toHaveText('Active: none')
  await expect(listbox.locator('[data-ch-active="true"]')).toHaveCount(0)

  await page.getByRole('button', { name: 'Next team' }).click()
  await expect(status).toContainText('Active: Vision')
  await expect(listbox.getByRole('option', { name: /^Vision/ })).toHaveAttribute(
    'data-ch-active',
    'true',
  )

  await page.getByRole('button', { name: 'Next team' }).click()
  await expect(status).toContainText('Active: Speech')
  await expect(listbox.getByRole('option', { name: /^Speech/ })).toHaveAttribute(
    'data-ch-active',
    'true',
  )
  await expect(listbox.locator('[data-ch-active="true"]')).toHaveCount(1)

  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(status).toHaveText('Active: none')
  await expect(listbox.locator('[data-ch-active="true"]')).toHaveCount(0)
})

test('the keyboard moves the active row and the text outside follows', async ({ page }) => {
  await page.goto('/docs/runway-chart')

  const listbox = page.getByRole('listbox', { name: SECOND })
  await listbox.focus()
  await expect(page.getByText(/^Active: /)).toContainText('Active: Vision')
  await page.keyboard.press('ArrowDown')
  await expect(page.getByText(/^Active: /)).toContainText('Active: Speech')
  await expect(listbox).toHaveAttribute('aria-activedescendant', /-row-1$/)
})
