import { expect, type Page } from '@playwright/test'

// Shared by the e2e specs: the story ids, their viewports and how to open one.

/** Every story with a screenshot baseline. */
export const STORIES = [
  'reference-last-12-weeks--light',
  'reference-last-12-weeks--dark',
  'primitives-legend--default',
  'charts-barchart--light',
  'charts-barchart--dark',
  'charts-barchart--horizontal',
  'reference-estimate-vs-actual--light',
  'reference-estimate-vs-actual--dark',
  'reference-result--light',
  'reference-result--dark',
  'reference-drill-columns--light',
  'reference-drill-columns--dark',
  'reference-gross-margin--light',
  'reference-gross-margin--dark',
  'primitives-small-pieces--default',
  'reference-why-it-is-under-target--light',
  'reference-why-it-is-under-target--dark',
  'reference-profit-bridge--light',
  'reference-profit-bridge--dark',
  'reference-jobs-by-margin--light',
  'reference-jobs-by-margin--dark',
  'reference-dallas-installs--light',
  'reference-dallas-installs--dark',
  'reference-profit-leaked--light',
  'reference-profit-leaked--dark',
  'reference-margin-outlook--light',
  'reference-margin-outlook--dark',
  'reference-where-it-leaks--light',
  'reference-where-it-leaks--dark',
  'charts-time-axis--hourly-light',
  'charts-time-axis--hourly-dark',
  'charts-time-axis--daily-light',
  'charts-time-axis--daily-dark',
  'charts-time-axis--monthly-light',
  'charts-time-axis--monthly-dark',
  'primitives-sequential--light',
  'primitives-sequential--dark',
]

// Stories whose reference layout needs more room than the default 800px viewport.
export const WIDE_STORIES: Record<string, { width: number; height: number }> = {
  'reference-drill-columns--light': { width: 1280, height: 600 },
  'reference-drill-columns--dark': { width: 1280, height: 600 },
  'reference-profit-bridge--light': { width: 1280, height: 720 },
  'reference-profit-bridge--dark': { width: 1280, height: 720 },
  'reference-jobs-by-margin--light': { width: 1280, height: 600 },
  'reference-jobs-by-margin--dark': { width: 1280, height: 600 },
  'reference-dallas-installs--light': { width: 1280, height: 600 },
  'reference-dallas-installs--dark': { width: 1280, height: 600 },
  'reference-margin-outlook--light': { width: 1280, height: 640 },
  'reference-margin-outlook--dark': { width: 1280, height: 640 },
  'reference-where-it-leaks--light': { width: 1280, height: 600 },
  'reference-where-it-leaks--dark': { width: 1280, height: 600 },
}

// Stories without a theme of their own follow the toolbar global: axe checks them in both themes.
export const THEMELESS = new Set([
  'primitives-legend--default',
  'charts-barchart--horizontal',
  'primitives-small-pieces--default',
  'reference-last-12-weeks--selectable',
])

export async function open(page: Page, id: string, theme?: 'light' | 'dark') {
  const globals = theme ? `&globals=theme:${theme}` : ''
  await page.goto(`/iframe.html?id=${id}&viewMode=story${globals}`)
  await page
    .locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]')
    .first()
    .waitFor()
  // The preview decorator puts the theme on the canvas: a dark run must really render dark.
  if (theme) {
    const canvas = page.locator('#storybook-root .sb-canvas')
    await expect(canvas).toHaveAttribute('data-ch-theme', theme)
    // And the theme's tokens apply: ink is dark on light, light on dark.
    const [red = 0] = channels(await canvas.evaluate((el) => getComputedStyle(el).color))
    expect(red > 128).toBe(theme === 'dark')
  }
}

/** sRGB channels 0–255 from a computed color: `rgb(…)`, `color(srgb …)` or `#rrggbb`. */
export function channels(color: string): number[] {
  if (color.startsWith('#')) return [1, 3, 5].map((i) => Number.parseInt(color.slice(i, i + 2), 16))
  const values = color.match(/[\d.]+/g)?.map(Number) ?? []
  return color.startsWith('color(') ? values.slice(0, 3).map((v) => v * 255) : values.slice(0, 3)
}
