import fs from 'node:fs'
import { launch, open, storyIds } from './common.mjs'
const browser = await launch()
const ids = (await storyIds()).filter(i => !/--dark$/.test(i))
const out = {}
const MEASURE = () => {
  const vw = document.documentElement.clientWidth
  const root = document.querySelector('#storybook-root')
  const texts = [...root.querySelectorAll('svg text, .ch-legend-label, .ch-heatmap-cell, .ch-heatmap-header span, .ch-heatmap-rowheader, .ch-pill, .ch-meter-labels span, .ch-range-labels span, .ch-stat-value')]
    .map(e => ({ e, b: e.getBoundingClientRect(), t: e.textContent.trim() })).filter(x => x.b.width > 0 && x.t)
  const offscreen = texts.filter(x => x.b.left < -1 || x.b.right > vw + 1).map(x => `${x.t.slice(0, 20)}@${Math.round(x.b.left)}..${Math.round(x.b.right)}`)
  const overlaps = []
  const svgTexts = texts.filter(x => x.e instanceof SVGElement)
  for (let i = 0; i < svgTexts.length; i++) for (let j = i + 1; j < svgTexts.length; j++) {
    const a = svgTexts[i].b, b = svgTexts[j].b
    if (svgTexts[i].e.ownerSVGElement !== svgTexts[j].e.ownerSVGElement) continue
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left), h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    if (w > 2 && h > 2 && w * h > 0.15 * Math.min(a.width * a.height, b.width * b.height)) overlaps.push(`"${svgTexts[i].t.slice(0, 18)}" x "${svgTexts[j].t.slice(0, 18)}"`)
  }
  // HTML text clipped by an ancestor (ellipsis/overflow) — heatmap headers, legend
  const clipped = [...root.querySelectorAll('.ch-heatmap-header span, .ch-heatmap-cell, .ch-heatmap-rowheader, .ch-legend-label, .ch-pill')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 20))
  const figs = [...root.querySelectorAll('figure[data-ch-root]')].map(f => { const s = f.querySelector('svg'); const fb = f.getBoundingClientRect(); return { w: Math.round(fb.width), svgW: s ? Number(s.getAttribute('width')) : null, h: Math.round(fb.height) } })
  const grid = root.querySelector('.ch-heatmap-grid'); 
  return { vw, docScrollW: document.documentElement.scrollWidth, hScroll: document.documentElement.scrollWidth > vw + 1, offscreen: offscreen.slice(0, 8), offscreenCount: offscreen.length, overlaps: overlaps.slice(0, 8), overlapCount: overlaps.length, clipped: clipped.slice(0, 6), figs, gridScrollW: grid ? [grid.scrollWidth, grid.clientWidth] : null }
}
for (const id of ids) {
  const o = out[id] = {}
  for (const [label, vp] of [['1280', { width: 1280, height: 800, dpr: 1 }], ['zoom200(640@2x)', { width: 640, height: 400, dpr: 2 }], ['320', { width: 320, height: 640, dpr: 1 }], ['zoom400(320@4x)', { width: 320, height: 256, dpr: 4 }]]) {
    if (label === 'zoom400(320@4x)') continue
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, reducedMotion: 'reduce' })
    const page = await ctx.newPage()
    await open(page, id, 'light')
    await page.waitForTimeout(300)
    o[label] = await page.evaluate(MEASURE)
    if (label === '320' || label.startsWith('zoom200')) await page.screenshot({ path: `shots/reflow-${label.replace(/[()@]/g, '_')}-${id}.png`, fullPage: true })
    await ctx.close()
  }
  const s = o['320']
  console.log(id.padEnd(42), '| 320: hScroll', s.hScroll, `(${s.docScrollW})`, 'offscreen', s.offscreenCount, 'overlaps', s.overlapCount, 'clipped', s.clipped.length, JSON.stringify(s.figs), '| 200%: hScroll', o['zoom200(640@2x)'].hScroll, 'overlaps', o['zoom200(640@2x)'].overlapCount, '| 1280 overlaps', o['1280'].overlapCount)
}
fs.writeFileSync('reflow.json', JSON.stringify(out, null, 1))
await browser.close()
