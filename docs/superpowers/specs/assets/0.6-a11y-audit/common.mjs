import { chromium } from 'playwright'
export const BASE = 'http://localhost:6006'
export async function storyIds() {
  const r = await fetch(`${BASE}/index.json`); const j = await r.json()
  return Object.values(j.entries).filter(e => e.type === 'story').map(e => e.id)
}
export const url = (id, theme) => `${BASE}/iframe.html?id=${id}&viewMode=story${theme ? `&globals=theme:${theme}` : ''}`
export async function open(page, id, theme) {
  await page.goto(url(id, theme))
  await page.locator('#storybook-root [data-ch-root], #storybook-root [data-ch-part]').first().waitFor({ timeout: 15000 })
  await page.waitForTimeout(600)
}
export const launch = () => chromium.launch()
