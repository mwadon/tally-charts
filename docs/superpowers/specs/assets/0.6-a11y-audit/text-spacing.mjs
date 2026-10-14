// WCAG 1.4.12 bookmarklet styles, then count overlapping SVG labels and clipped HTML text at 1280px.
import fs from 'node:fs'
import { launch, open, storyIds } from './common.mjs'
const SPACING = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`
const browser = await launch()
const ids = (await storyIds()).filter(i => !/--dark$/.test(i))
const out = {}
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  await open(page, id, 'light')
  const count = () => page.evaluate(() => {
    const root = document.querySelector('#storybook-root'); const vw = innerWidth
    const t = [...root.querySelectorAll('svg text')].map(e => ({ e, b: e.getBoundingClientRect(), s: e.textContent.trim() })).filter(x => x.b.width)
    const ov = []
    for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) { if (t[i].e.ownerSVGElement !== t[j].e.ownerSVGElement) continue; const a = t[i].b, b = t[j].b; const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (w > 2 && h > 2) ov.push(`"${t[i].s.slice(0, 16)}" x "${t[j].s.slice(0, 16)}"`) }
    const clipped = [...root.querySelectorAll('.ch-heatmap-cell, .ch-heatmap-header span, .ch-pill, .ch-legend-label, .ch-meter-labels span, .ch-range-labels span')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.textContent.trim().slice(0, 16))
    return { ov, clipped }
  })
  const before = await count()
  await page.addStyleTag({ content: SPACING }); await page.waitForTimeout(150)
  const after = await count()
  out[id] = { before, after }
  console.log(id.padEnd(42), 'overlaps', before.ov.length, '->', after.ov.length, after.ov.slice(0, 3).join('; '), '| clipped', before.clipped.length, '->', after.clipped.length, after.clipped.slice(0, 3).join('; '))
  await page.close()
}
fs.writeFileSync('text-spacing.json', JSON.stringify(out, null, 1))
await browser.close()
