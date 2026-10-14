// Pixel-based text contrast on rendered stories (axe returns "incomplete" for all SVG text).
// fg = computed color/fill; bg = pixels under the text box with all text made transparent.
import fs from 'node:fs'
import { PNG } from 'pngjs'
import { launch, open, storyIds } from './common.mjs'
const parse = (s) => { const m = s.match(/[\d.]+/g)?.map(Number) ?? [0,0,0,0]; if (s.startsWith('color(')) return [...m.slice(0,3).map(v=>v*255), m[3] ?? 1]; return [m[0],m[1],m[2], m[3] ?? 1] }
const lum = ([r,g,b]) => { const f = v => { v/=255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4 }; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b) }
const cr = (a,b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05) }
const hex = (c) => '#' + c.slice(0,3).map(v=>Math.round(v).toString(16).padStart(2,'0')).join('')
const COLLECT = () => {
  const out = []
  const root = document.querySelector('#storybook-root')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let n
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue
    const el = n.parentElement
    if (el.closest('.ch-sr-only,[hidden],[aria-hidden="true"] .ch-sr-only')) continue
    const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect()
    if (b.width < 1 || b.height < 1) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    let op = 1; for (let e = el; e && e !== document.body; e = e.parentElement) op *= Number(getComputedStyle(e).opacity)
    const svg = el instanceof SVGElement
    const fg = svg ? cs.fill : cs.color
    const part = el.closest('[data-ch-part]')?.getAttribute('data-ch-part') ?? el.className?.baseVal ?? el.className
    const sel = (el.getAttribute('data-ch-part') ? `[data-ch-part=${el.getAttribute('data-ch-part')}]` : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.split(' ').join('.') : '')
    out.push({ text: n.textContent.trim().slice(0, 40), x: b.x + scrollX, y: b.y + scrollY, w: b.width, h: b.height, fg, op, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight), part, tag: el.tagName.toLowerCase(), sel })
  }
  return out
}
const HIDE = `#storybook-root *{color:transparent!important;text-shadow:none!important;caret-color:transparent!important} #storybook-root svg text,#storybook-root svg tspan{fill:transparent!important;stroke:none!important}`
async function measure(page, scope) {
  const items = (await page.evaluate(COLLECT)).filter(i => !scope || i.inTooltip !== false)
  const shot = PNG.sync.read(await (async () => { const h = await page.addStyleTag({ content: HIDE }); const s = await page.screenshot({ fullPage: true, animations: 'disabled' }); await h.evaluate(e => e.remove()); return s })())
  const dpr = 1
  const res = []
  for (const it of items) {
    const ratios = []; const bgs = []
    const [fr,fg,fb,fa] = parse(it.fg); const a = fa * it.op
    for (let y = Math.floor(it.y); y < Math.ceil(it.y + it.h); y++) for (let x = Math.floor(it.x); x < Math.ceil(it.x + it.w); x++) {
      if (x < 0 || y < 0 || x >= shot.width || y >= shot.height) continue
      const i = (y * shot.width + x) * 4; const bg = [shot.data[i], shot.data[i+1], shot.data[i+2]]
      const f = [fr*a + bg[0]*(1-a), fg*a + bg[1]*(1-a), fb*a + bg[2]*(1-a)]
      ratios.push(cr(f, bg)); bgs.push(bg)
    }
    if (!ratios.length) continue
    const sorted = ratios.map((r, k) => [r, k]).sort((p, q) => p[0] - q[0])
    const med = sorted[Math.floor(sorted.length / 2)]
    const p10 = sorted[Math.floor(sorted.length * 0.1)]
    const large = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700)
    res.push({ ...it, fgHex: hex([fr,fg,fb]), alpha: +a.toFixed(2), bgMedian: hex(bgs[med[1]]), median: +med[0].toFixed(2), p10: +p10[0].toFixed(2), bgP10: hex(bgs[p10[1]]), need: large ? 3 : 4.5 })
  }
  return res
}
const browser = await launch()
const ids = await storyIds()
const all = []
const seen = new Set()
for (const theme of ['light', 'dark']) for (const id of ids) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' })
  const page = await ctx.newPage()
  await open(page, id, theme)
  const eff = await page.locator('.sb-canvas').getAttribute('data-ch-theme')
  if (seen.has(id + eff)) { await ctx.close(); continue } seen.add(id + eff)
  for (const r of await measure(page)) all.push({ id, theme: eff, state: 'rest', ...r })
  // Active state: focus each interactive chart / heatmap cell so tooltips, highlights and dimming show.
  const figs = await page.locator('#storybook-root figure[tabindex="0"], #storybook-root [role="gridcell"][tabindex="0"]').all()
  for (let k = 0; k < figs.length; k++) {
    await figs[k].focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100)
    const rs = await measure(page)
    for (const r of rs) if (['tooltip','tooltip-pill','callout','heatmap-cell','axis-label','value-label','row-label'].includes(r.part) || /ch-pill/.test(String(r.sel))) all.push({ id, theme: eff, state: `focus#${k}`, ...r })
  }
  await ctx.close()
  console.log(id, eff, 'done')
}
fs.writeFileSync('rendered-contrast.json', JSON.stringify(all, null, 1))
await browser.close()
const fails = all.filter(r => r.median < r.need)
const key = r => `${r.theme}|${r.part}|${r.sel}|${r.fgHex}|${r.bgMedian}`
const groups = new Map()
for (const f of fails) { const k = key(f); const g = groups.get(k) ?? { ...f, stories: new Set(), texts: new Set(), min: 99 }; g.stories.add(`${f.id}(${f.state})`); g.texts.add(f.text); g.min = Math.min(g.min, f.median); groups.set(k, g) }
console.log('\nFAILING TEXT (median contrast < need):', fails.length)
for (const g of groups.values()) console.log(g.theme, g.part, g.sel, g.fgHex, 'a=' + g.alpha, 'on', g.bgMedian, 'min', g.min.toFixed(2), 'need', g.need, '|', [...g.texts].slice(0,4).join(' / '), '|', [...g.stories].slice(0,5).join(', '))
const lows = all.filter(r => r.median >= r.need && r.p10 < r.need)
console.log('\nBORDERLINE (median passes, p10 fails):', lows.length)
const g2 = new Map(); for (const f of lows) { const k = key(f); if (!g2.has(k)) g2.set(k, f) }
for (const f of g2.values()) console.log(f.theme, f.part, f.sel, f.fgHex, 'on', f.bgP10, 'p10', f.p10, 'med', f.median, '|', f.text, '|', f.id, f.state)
