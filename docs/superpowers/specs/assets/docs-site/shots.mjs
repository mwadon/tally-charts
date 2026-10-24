// Writes the 8 design screenshots: home and line-chart × 1280/375 px × light/dark.
// Needs `next start` running (see common.mjs). Usage: node shots.mjs
import path from 'node:path'
import { chromium, PAGES, settle, THEMES, url, VIEWPORTS } from './common.mjs'

const out = import.meta.dirname
const browser = await chromium.launch()
for (const [name, route] of Object.entries(PAGES)) {
  for (const [w, viewport] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport,
        reducedMotion: 'reduce',
        colorScheme: theme,
        deviceScaleFactor: 1,
      })
      const page = await context.newPage()
      await page.goto(url(route, theme), { waitUntil: 'networkidle' })
      await settle(page)
      const file = path.join(out, `${name}-${w}-${theme}.png`)
      await page.screenshot({ path: file, fullPage: true, animations: 'disabled' })
      console.log(file)
      await context.close()
    }
  }
}
await browser.close()
