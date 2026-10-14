// Resolves theme tokens in the real browser (color-mix included) and computes WCAG contrast.
import fs from 'node:fs'
import { launch, open } from './common.mjs'
const browser = await launch(); const page = await browser.newPage()
await open(page, 'primitives-legend--default', 'light')
const TONES = ['accent','accent-soft','loss','warn','gain','neutral']
const resolved = await page.evaluate((TONES) => {
  const probe = (theme, tone, css) => {
    const host = document.createElement('div'); host.setAttribute('data-ch-theme', theme)
    const el = document.createElement('div'); el.className = 'ch-heatmap'
    if (tone) { el.setAttribute('data-ch-seq-tone', tone); el.style.setProperty('--ch-seq-base', `var(--ch-${tone})`); el.style.setProperty('--ch-swatch-color', `var(--ch-${tone})`) }
    el.style.background = css; host.appendChild(el); document.body.appendChild(host)
    const v = getComputedStyle(el).backgroundColor; host.remove(); return v
  }
  const out = {}
  for (const theme of ['light','dark']) {
    const t = out[theme] = { tokens: {}, tones: {} }
    for (const n of ['ink','ink-muted','grid','surface','tooltip-bg','tooltip-ink', ...TONES]) t.tokens[n] = probe(theme, null, `var(--ch-${n})`)
    t.tokens['canvas(sb)'] = probe(theme, null, 'color-mix(in srgb, var(--ch-surface) 94%, var(--ch-ink))')
    t.tokens['bar-track'] = probe(theme, null, 'color-mix(in srgb, var(--ch-grid) 55%, var(--ch-surface))')
    for (const tone of TONES) {
      const x = t.tones[tone] = {}
      x.base = probe(theme, tone, `var(--ch-${tone})`)
      x.toneText = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))')
      x.soft45 = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) 45%, var(--ch-surface))')
      x.hatchTint = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) calc(var(--ch-hatch-tint) * 100%), var(--ch-surface))')
      x.dimmed = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) calc(var(--ch-dim-opacity) * 100%), var(--ch-surface))')
      x.fadeEnd30 = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) 30%, var(--ch-surface))')
      x.dotCount45 = x.soft45
      x.band18 = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) 18%, var(--ch-surface))')
      x.area22 = probe(theme, tone, 'color-mix(in srgb, var(--ch-swatch-color) 22%, var(--ch-surface))')
      for (const l of [1,2,3,4,5]) x[`seq${l}`] = probe(theme, tone, `var(--ch-seq-${l})`)
    }
  }
  return out
}, TONES)
await browser.close()
const parse = (s) => { const m = s.match(/[\d.]+/g).map(Number); return s.startsWith('color(') ? m.slice(0,3).map(v=>Math.round(v*255)) : m.slice(0,3) }
const lum = (c) => { const [r,g,b] = c.map(v => { v/=255; return v <= 0.04045 ? v/12.92 : ((v+0.055)/1.055)**2.4 }); return 0.2126*r+0.7152*g+0.0722*b }
const cr = (a,b) => { const [x,y] = [lum(parse(a)), lum(parse(b))].sort((p,q)=>q-p); return +( (x+0.05)/(y+0.05) ).toFixed(2) }
const hex = (s) => '#' + parse(s).map(v=>v.toString(16).padStart(2,'0')).join('')
const rows = []
const add = (theme, kind, what, fg, bg, need) => rows.push({ theme, kind, what, fg: hex(fg), bg: hex(bg), ratio: cr(fg,bg), need, pass: cr(fg,bg) >= need })
for (const theme of ['light','dark']) {
  const T = resolved[theme].tokens, S = T.surface, TB = T['tooltip-bg'], C = T['canvas(sb)']
  add(theme,'text','ink on surface',T.ink,S,4.5)
  add(theme,'text','ink-muted on surface (axis/target labels 12px, row sublabels)',T['ink-muted'],S,4.5)
  add(theme,'text','ink-muted on tooltip-bg (pill label)',T['ink-muted'],TB,4.5)
  add(theme,'text','tooltip-ink on tooltip-bg',T['tooltip-ink'],TB,4.5)
  add(theme,'text','ink-muted on sb canvas',T['ink-muted'],C,4.5)
  add(theme,'text','ink-muted on bar-track (meter labels n/a; row label over track)',T['ink-muted'],T['bar-track'],4.5)
  add(theme,'non-text','grid line vs surface',T.grid,S,3)
  add(theme,'non-text','bar-track vs surface (meter/inline-bar track, RankedBars track)',T['bar-track'],S,3)
  add(theme,'non-text','ink-muted connector/callout stem vs surface',T['ink-muted'],S,3)
  add(theme,'non-text','focus ring accent vs surface',T.accent,S,3)
  add(theme,'non-text','focus ring accent vs sb canvas',T.accent,C,3)
  add(theme,'non-text','heatmap level-0 border (grid) vs surface',T.grid,S,3)
  for (const [tone, x] of Object.entries(resolved[theme].tones)) {
    add(theme,'non-text',`${tone} solid mark vs surface`,x.base,S,3)
    add(theme,'non-text',`${tone} hatch tint (between stripes) vs surface`,x.hatchTint,S,3)
    add(theme,'non-text',`${tone} soft dot (45%) vs surface`,x.soft45,S,3)
    add(theme,'non-text',`${tone} dimmed mark (opacity .35) vs surface`,x.dimmed,S,3)
    add(theme,'non-text',`${tone} hatch-fade inner end (mask .3) vs surface`,x.fadeEnd30,S,3)
    add(theme,'non-text',`${tone} band 18% vs surface`,x.band18,S,3)
    add(theme,'text',`${tone} tone-text (55% mix) on surface`,x.toneText,S,4.5)
    add(theme,'text',`${tone} tone-text on tooltip-bg`,x.toneText,TB,4.5)
    add(theme,'text',`${tone} RAW tone as pill value text on tooltip-bg (.ch-pill-seg[data-ch-tone] .ch-pill-value)`,x.base,TB,4.5)
    for (const l of [1,2,3,4]) add(theme,'text',`${tone} heatmap level ${l} cell: ink on seq-${l}`,T.ink,x[`seq${l}`],4.5)
    add(theme,'text',`${tone} heatmap level 5 cell: white on seq-5`,'rgb(255,255,255)',x.seq5,4.5)
    for (const l of [1,2,3,4,5]) add(theme,'non-text',`${tone} seq-${l} swatch/cell vs surface`,x[`seq${l}`],S,3)
    for (const l of [1,2,3,4]) rows.push({ theme, kind:'adjacent', what:`${tone} seq-${l} vs seq-${l+1}`, fg: hex(x[`seq${l}`]), bg: hex(x[`seq${l+1}`]), ratio: cr(x[`seq${l}`], x[`seq${l+1}`]), need: 0, pass: true })
  }
  add(theme,'text','ink-muted on heatmap level-0 (surface) dash',T['ink-muted'],S,4.5)
}
fs.writeFileSync('contrast-tokens.json', JSON.stringify({ resolved, rows }, null, 2))
for (const r of rows) console.log(r.pass ? '  ' : 'XX', r.theme.padEnd(5), r.kind.padEnd(8), r.ratio.toString().padStart(5), r.need, r.fg, r.bg, r.what)
