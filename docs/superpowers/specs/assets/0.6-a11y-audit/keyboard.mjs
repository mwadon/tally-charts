import fs from 'node:fs'
import { launch, open, storyIds } from './common.mjs'
const browser = await launch()
const ids = (await storyIds()).filter(i => !/--dark$/.test(i))
const report = {}
const desc = () => {
  const e = document.activeElement
  if (!e || e === document.body) return { tag: 'body' }
  const cs = getComputedStyle(e)
  return {
    tag: e.tagName.toLowerCase(), role: e.getAttribute('role'), part: e.getAttribute('data-ch-part'),
    name: e.getAttribute('aria-label') ?? (e.getAttribute('aria-labelledby') ? document.getElementById(e.getAttribute('aria-labelledby'))?.textContent : null) ?? e.textContent.trim().slice(0, 40),
    tabindex: e.getAttribute('tabindex'), focusVisible: e.matches(':focus-visible'),
    outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} off ${cs.outlineOffset}`, boxShadow: cs.boxShadow.slice(0, 120),
    activedescendant: e.getAttribute('aria-activedescendant'),
    rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(e.getBoundingClientRect()),
  }
}
const state = (el) => el.evaluate((f) => ({
  live: f.querySelector('[aria-live]')?.textContent ?? null,
  tooltip: f.querySelector('[data-ch-part="tooltip"]')?.textContent ?? null,
  active: [...f.querySelectorAll('[data-ch-active="true"]')].map(x => x.getAttribute('data-ch-part')).join(','),
  focused: document.activeElement === f || f.contains(document.activeElement),
  activeEl: document.activeElement?.getAttribute('data-ch-part') ?? document.activeElement?.tagName,
  activeText: document.activeElement?.textContent?.trim().slice(0, 30),
}))
for (const id of ids) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await open(page, id, 'light')
  const r = report[id] = { tabOrder: [], charts: [] }
  // Tab walk from the top of the document.
  await page.locator('body').click({ position: { x: 2, y: 2 } })
  for (let k = 0; k < 25; k++) {
    await page.keyboard.press('Tab')
    const d = await page.evaluate(desc)
    if (d.tag === 'body' || r.tabOrder.some(t => JSON.stringify(t.rect) === JSON.stringify(d.rect) && t.name === d.name)) break
    r.tabOrder.push(d)
  }
  // Shift+Tab back from the end.
  await page.keyboard.press('Shift+Tab'); r.shiftTab = await page.evaluate(desc)
  const figs = await page.locator('#storybook-root figure[tabindex="0"]').all()
  for (const [k, fig] of figs.entries()) {
    const c = { index: k, name: await fig.evaluate(f => f.getAttribute('aria-labelledby') ? document.getElementById(f.getAttribute('aria-labelledby'))?.textContent : null), steps: [] }
    await fig.focus()
    c.focusRing = await page.evaluate(desc)
    for (const key of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'End', 'End', 'Home', 'Home', 'Enter', 'Escape', 'Escape', 'Tab']) {
      const before = await page.evaluate(() => document.querySelector('[data-testid]')?.textContent ?? null)
      await page.keyboard.press(key)
      await page.waitForTimeout(60)
      const s = await state(fig)
      s.key = key; s.testid = await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map(e => e.textContent).join(' | '))
      c.steps.push(s)
    }
    r.charts.push(c)
  }
  // Heatmap grid
  const grid = page.locator('#storybook-root [role="grid"]')
  if (await grid.count()) {
    const h = r.heatmap = { steps: [] }
    await grid.locator('[role="gridcell"][tabindex="0"]').first().focus()
    const g = async (key) => { if (key) await page.keyboard.press(key); await page.waitForTimeout(40); return { key, ...(await page.evaluate(desc)), tabStops: await grid.locator('[tabindex="0"]').count() } }
    h.steps.push(await g(null))
    for (const key of ['ArrowRight','ArrowRight','ArrowDown','End','Home','ArrowUp','ArrowUp','ArrowLeft','Control+End','PageDown','Enter','Escape']) h.steps.push(await g(key))
    await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown')
    h.beforeTabOut = await page.evaluate(desc)
    await page.keyboard.press('Tab'); h.afterTab = await page.evaluate(desc)
    await page.keyboard.press('Shift+Tab'); h.afterShiftTab = await page.evaluate(desc)
    h.liveRegion = await page.evaluate(() => !!document.querySelector('.ch-heatmap [aria-live]'))
    h.tooltip = await page.evaluate(() => !!document.querySelector('.ch-heatmap [data-ch-part="tooltip"]'))
  }
  await ctx.close()
  console.log(id, 'tab stops:', r.tabOrder.length, 'figs:', figs.length)
}
fs.writeFileSync('keyboard.json', JSON.stringify(report, null, 1))
await browser.close()
