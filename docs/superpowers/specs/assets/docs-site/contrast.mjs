// Measures WCAG contrast of the real, computed colors of the docs pages in light and dark and
// prints a markdown table. Exit code 1 when a pair is below its minimum.
// Needs `next start` running (see common.mjs). Usage: node contrast.mjs > contrast.md
import { BASE, chromium, settle, THEMES, url, VIEWPORTS } from './common.mjs'

const TEXT = 4.5
const UI = 3

// [label, page, selector, kind]. kind: text (fg=color), border (fg=border color), fill (own bg vs
// the parent's bg). `actualOnly` pairs (inverse text on a filled control) skip the token columns.
const SAMPLES = [
  ['Body text (ink)', 'docs', '.doc > h2 + p', 'text'],
  ['Heading h1 (ink)', 'docs', 'h1', 'text'],
  ['Lede / muted text (ink-muted)', 'docs', '.lede', 'text'],
  ['Small note (ink-muted)', 'docs', '.small', 'text'],
  ['Eyebrow (ink-muted)', 'docs', '.eyebrow', 'text'],
  ['Inline link (accent 70% + ink)', 'docs', '.doc p a', 'text'],
  ['Link in "Keep going" (home)', 'home', '.link-row a', 'text'],
  ['Header link', 'docs', '.header-links a', 'text'],
  ['Wordmark', 'docs', '.wordmark', 'text'],
  ['Version badge (ink-muted)', 'docs', '.version', 'text'],
  ['Side nav active item', 'docs', '.side-nav a[aria-current="page"]', 'text'],
  ['Side nav disabled item (ink-muted)', 'docs', '.nav-soon', 'text'],
  ['Side nav group label (ink-muted)', 'docs', '.side-nav-group', 'text'],
  ['ToC link (ink-muted)', 'docs', '.toc-column a', 'text'],
  ['ToC disclosure summary (mobile)', 'docs', '.toc-inline summary', 'text'],
  ['Menu button (mobile)', 'docs', '.menu-button', 'text'],
  ['Inline code', 'docs', ':not(pre) > code', 'text'],
  ['Code text', 'docs', '.doc pre code', 'text'],
  ['Code filename (ink-muted)', 'docs', '.code-block-name', 'text'],
  ['Syntax: keyword', 'docs', '[data-tok="keyword"]', 'text'],
  ['Syntax: string', 'docs', '[data-tok="string"]', 'text'],
  ['Syntax: number', 'docs', '[data-tok="number"]', 'text'],
  ['Syntax: tag', 'docs', '[data-tok="tag"]', 'text'],
  ['Syntax: function', 'docs', '[data-tok="fn"]', 'text'],
  ['Copy button text', 'docs', '.code-copy', 'text'],
  ['Preview/Code toggle, unselected', 'docs', '.segmented button[aria-pressed="false"]', 'text'],
  ['Preview/Code toggle, selected', 'docs', '.segmented button[aria-pressed="true"]', 'text'],
  ['Button, primary', 'home', '.button-primary', 'text'],
  ['Button, secondary', 'home', '.button:not(.button-primary)', 'text'],
  ['Table header (ink-muted)', 'docs', 'thead th', 'text'],
  ['Table cell', 'docs', 'tbody td', 'text'],
  ['Card text (ink-muted)', 'home', '.card p', 'text'],
  ['Card heading', 'home', '.card h3', 'text'],
  ['Footer (ink-muted)', 'home', '.site-footer p', 'text'],
  ['Disabled link placeholder (home)', 'home', '.link-row .nav-soon', 'text'],
  ['Border: Copy button', 'docs', '.code-copy', 'border'],
  ['Border: toggle, unselected', 'docs', '.segmented button[aria-pressed="false"]', 'border'],
  ['Border: secondary button', 'home', '.button:not(.button-primary)', 'border'],
  ['Border: Menu button (mobile)', 'docs', '.menu-button', 'border'],
  ['Fill: selected toggle vs card', 'docs', '.segmented button[aria-pressed="true"]', 'fill'],
  ['Fill: primary button vs page', 'home', '.button-primary', 'fill'],
]
const INVERSE = new Set(['Preview/Code toggle, selected', 'Button, primary'])

const measure = ([, , selector, kind]) => {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3])
    return [0, 1, 2].map((i) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / (a || 1)).concat(a)
  }
  const backdrop = (el) => {
    let acc = [0, 0, 0, 0]
    for (let n = el; n; n = n.parentElement) {
      acc = over(acc, rgba(getComputedStyle(n).backgroundColor))
      if (acc[3] >= 0.999) break
    }
    return acc
  }
  const el = [...document.querySelectorAll(selector)].find((e) => e.getClientRects().length > 0)
  if (!el) return null
  const cs = getComputedStyle(el)
  const token = (name) => {
    const probe = document.createElement('i')
    probe.style.background = `var(--ch-${name})`
    document.body.append(probe)
    const v = rgba(getComputedStyle(probe).backgroundColor)
    probe.remove()
    return v
  }
  const base = { surface: token('surface'), tooltipBg: token('tooltip-bg') }
  if (kind === 'fill') {
    return { ...base, fg: rgba(cs.backgroundColor), actual: backdrop(el.parentElement) }
  }
  const color = kind === 'border' ? cs.borderTopColor : cs.color
  const bg = kind === 'border' ? backdrop(el.parentElement) : backdrop(el)
  return { ...base, fg: rgba(color), actual: bg }
}

const lum = (c) => {
  const [r, g, b] = c.slice(0, 3).map((v) => {
    v /= 255
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const hex = (c) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const fmt = (r) => r.toFixed(2)

const browser = await chromium.launch()
const results = new Map() // `${label}|${theme}` -> measurement
const focus = { light: [], dark: [] }

for (const theme of THEMES) {
  for (const [w, viewport] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: theme })
    const page = await context.newPage()
    for (const route of ['docs', 'home']) {
      await page.goto(url(route === 'docs' ? '/docs/line-chart' : '/', theme), { waitUntil: 'networkidle' })
      await settle(page)
      const sweep = async () => {
        for (const sample of SAMPLES.filter((s) => s[1] === route)) {
          const key = `${sample[0]}|${theme}`
          if (results.has(key)) continue
          const m = await page.evaluate(measure, sample)
          if (m) results.set(key, { ...m, kind: sample[3], label: sample[0] })
        }
      }
      await sweep()
      if (route === 'docs') {
        // The ChartExample source (number and tag tokens) is only rendered in the Code view.
        await page.getByRole('button', { name: 'Code', exact: true }).click()
        await sweep()
        await page.getByRole('button', { name: 'Preview', exact: true }).click()
      }
      if (w === '1280') {
        // Keyboard focus: Tab twice (skip link, wordmark), then to the toggle on the docs page.
        await page.keyboard.press('Tab')
        await page.keyboard.press('Tab')
        const targets = ['.wordmark']
        if (route === 'docs') targets.push('.segmented button', '.code-copy', '.side-nav a')
        for (const sel of targets) {
          await page.locator(sel).first().focus()
          focus[theme].push(
            await page.evaluate(
              ([s]) => {
                const el = document.querySelector(s)
                const cs = getComputedStyle(el)
                return { sel: s, style: cs.outlineStyle, width: cs.outlineWidth, offset: cs.outlineOffset, color: cs.outlineColor, matches: el.matches(':focus-visible') }
              },
              [sel],
            ),
          )
        }
      }
    }
    await context.close()
  }
}
await browser.close()

// Focus ring: outline color against both backgrounds, per theme.
const probeCtx = await (async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext()
  const p = await ctx.newPage()
  const rgbaOf = async (css) =>
    p.evaluate((c) => {
      const cv = document.createElement('canvas')
      cv.width = cv.height = 1
      const x = cv.getContext('2d', { willReadFrequently: true })
      x.fillStyle = c
      x.fillRect(0, 0, 1, 1)
      const d = x.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }, css)
  return { rgbaOf, close: () => b.close() }
})()

const rows = []
let failed = 0
const labels = [...new Set(SAMPLES.map((s) => s[0]))]
const cell = (m, theme) => {
  if (!m) return ['n/a', 'n/a', 'n/a', 'n/a']
  const need = m.kind === 'text' ? TEXT : UI
  const check = (r) => {
    if (r < need) failed++
    return `${fmt(r)}${r < need ? ' ✗' : ''}`
  }
  const inverse = INVERSE.has(m.label)
  return [
    hex(m.fg),
    inverse ? '–' : check(ratio(m.fg, m.surface)),
    inverse ? '–' : check(ratio(m.fg, m.tooltipBg)),
    `${check(ratio(m.fg, m.actual))} (${hex(m.actual)})`,
  ]
}
for (const label of labels) {
  const light = results.get(`${label}|light`)
  const dark = results.get(`${label}|dark`)
  const kind = (light ?? dark)?.kind
  const need = kind === 'text' ? TEXT : UI
  rows.push(`| ${label} | ${need}:1 | ${cell(light).join(' | ')} | ${cell(dark).join(' | ')} |`)
}

const focusRows = []
for (const theme of THEMES) {
  const surface = results.get(`Body text (ink)|${theme}`).surface
  const tooltip = results.get(`Body text (ink)|${theme}`).tooltipBg
  for (const f of focus[theme]) {
    const c = await probeCtx.rgbaOf(f.color)
    const r1 = ratio(c, surface)
    const r2 = ratio(c, tooltip)
    const ok = f.matches && f.style === 'solid' && Number.parseFloat(f.width) >= 2 && r1 >= UI && r2 >= UI
    if (!ok) failed++
    focusRows.push(
      `| ${theme} | \`${f.sel}\` | ${f.style} ${f.width}, offset ${f.offset} | ${hex(c)} | ${fmt(r1)} | ${fmt(r2)} | ${ok ? 'ok' : '✗'} |`,
    )
  }
}
await probeCtx.close()

console.log(`<!-- generated by contrast.mjs against ${BASE} -->`)
console.log(`| Element | Min | Light fg | on surface | on tooltip-bg | actual bg | Dark fg | on surface | on tooltip-bg | actual bg |`)
console.log('|---|---|---|---|---|---|---|---|---|---|')
console.log(rows.join('\n'))
console.log('')
console.log('| Theme | Focused element | Outline | Color | vs surface | vs tooltip-bg | Result |')
console.log('|---|---|---|---|---|---|---|')
console.log(focusRows.join('\n'))
console.error(failed ? `${failed} pair(s) below the minimum` : 'all pairs pass')
process.exit(failed ? 1 : 0)
