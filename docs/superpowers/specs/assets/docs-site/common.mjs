// Shared by shots.mjs and contrast.mjs. Playwright comes from the apps/docs workspace package,
// so this directory has no package.json and no node_modules of its own.
import { createRequire } from 'node:module'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '../../../../..')
const require = createRequire(path.join(root, 'apps/docs/package.json'))
export const { chromium } = require('@playwright/test')

// `next start` of apps/docs: `pnpm build && pnpm --filter docs build && pnpm --filter docs start`.
export const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100'
export const PAGES = { home: '/', 'line-chart': '/docs/line-chart' }
export const THEMES = ['light', 'dark']
export const VIEWPORTS = { 1280: { width: 1280, height: 1400 }, 375: { width: 375, height: 812 } }

export function url(route, theme) {
  return `${BASE}${route}?theme=${theme}`
}

// Waits for the charts to be drawn (the application role carries the chart name).
export async function settle(page) {
  await page.waitForSelector('[role="application"] svg')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
}
