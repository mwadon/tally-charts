// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { TONES } from '../core/types'

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8')

type Rgb = [number, number, number]

/** Custom properties declared in the first rule whose selector list matches `selector`. */
function declarations(selector: RegExp): Map<string, string> {
  const body = css.match(new RegExp(`${selector.source}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
  // Values on one line, as the formatter may wrap a long color-mix().
  const flat = (v: string) =>
    v.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim()
  return new Map(
    [...body.matchAll(/(--_?ch-[\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', flat(m[2] ?? '')]),
  )
}

function hex(value: string | undefined): Rgb {
  const h = value === '#fff' ? '#ffffff' : value === '#000' ? '#000000' : (value ?? '')
  expect(h).toMatch(/^#[0-9a-f]{6}$/i)
  return [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as Rgb
}

/** color-mix(in srgb, a p%, b) for opaque colors, rounded to 8 bits like the browser. */
const mix = (a: Rgb, p: number, b: Rgb): Rgb =>
  a.map((v, i) => Math.round(v * p + (b[i] as number) * (1 - p))) as Rgb

function luminance(c: Rgb): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const THEMES = {
  light: declarations(/:root,\s*\[data-ch-theme="light"\]/),
  dark: declarations(/\n\[data-ch-theme="dark"\]/),
}
const SEQ = declarations(
  /\[data-ch-root\],\s*\[data-ch-part="legend"\],\s*\[data-ch-part="heatmap"\],\s*\[data-ch-part="runway"\]/,
)
const LEVELS = [1, 2, 3, 4, 5] as const

const toHex = (c: Rgb) => `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`

/**
 * A custom property value as the browser computes it: every `var()` replaced from `env` (or its
 * fallback), then every `color-mix(in srgb, #a p%, #b)` evaluated to a hex color.
 */
function resolve(value: string, env: ReadonlyMap<string, string>): string {
  let out = value
  for (let guard = 0; guard < 100 && out.includes('var('); guard++) {
    // The last var( has no var( inside it.
    const start = out.lastIndexOf('var(')
    let depth = 0
    let end = start + 3
    for (; end < out.length; end++) {
      if (out[end] === '(') depth++
      if (out[end] === ')' && --depth === 0) break
    }
    const inner = out.slice(start + 4, end)
    const comma = inner.indexOf(',')
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
    const fallback = comma < 0 ? undefined : inner.slice(comma + 1).trim()
    const found = env.get(name) ?? fallback
    expect(found, `${name} in ${value}`).toBeDefined()
    out = out.slice(0, start) + found + out.slice(end + 1)
  }
  const MIX = /color-mix\(in srgb, (#[0-9a-f]{3,6}) ([\d.]+)%, (#[0-9a-f]{3,6})\)/i
  for (let guard = 0; guard < 20 && MIX.test(out); guard++) {
    out = out.replace(MIX, (_, a: string, p: string, b: string) =>
      toHex(mix(hex(a), Number.parseFloat(p) / 100, hex(b))),
    )
  }
  return out
}

/** The custom properties a heatmap or legend sees in a theme, under a `data-ch-seq-tone`. */
function seqEnv(theme: keyof typeof THEMES, tone?: string): Map<string, string> {
  const toneRule = tone ? declarations(new RegExp(`\\[data-ch-seq-tone="${tone}"\\]`)) : []
  return new Map([...THEMES[theme], ...toneRule])
}

/** The five level colors of a ramp. */
function ramp(theme: keyof typeof THEMES, tone?: string): Rgb[] {
  const env = seqEnv(theme, tone)
  return LEVELS.map((level) => hex(resolve(SEQ.get(`--ch-seq-${level}`) ?? '', env)))
}

const MATRIX = (Object.keys(THEMES) as (keyof typeof THEMES)[]).flatMap((theme) =>
  TONES.flatMap((tone) => LEVELS.map((level) => ({ theme, tone, level }))),
)

const STEP_MATRIX = MATRIX.filter(({ level }) => level < 5)

const TONE_MATRIX = (Object.keys(THEMES) as (keyof typeof THEMES)[]).flatMap((theme) =>
  TONES.map((tone) => ({ theme, tone })),
)
/** Share of the tone in toned text and outlines (`--ch-tone-text-mix`), 0–1. */
const TEXT_MIX =
  Number.parseFloat(declarations(/\n:root(?=\s*\{)/).get('--ch-tone-text-mix') ?? '') / 100
/** The color toned text and the outlines of soft and hatched marks are painted in. */
const inked = (theme: keyof typeof THEMES, tone: string) =>
  mix(hex(THEMES[theme].get(`--ch-${tone}`)), TEXT_MIX, hex(THEMES[theme].get('--ch-ink')))

/** The forced-colors block, and the stylesheet before it (the themes). */
const FORCED_AT = css.indexOf('@media (forced-colors: active)')
const themed = css.slice(0, FORCED_AT)
/** The three theme blocks, before the vivid palette that restyles three of their tokens. */
const PALETTE_AT = css.indexOf('/* ---------- Palette: vivid')
const themeBlocks = themed.slice(0, PALETTE_AT)
const forced = css.slice(FORCED_AT)

describe('theme.css', () => {
  it.each(TONES)('defines --ch-%s for light, system dark and forced dark', (tone) => {
    expect(themeBlocks.match(new RegExp(`--ch-${tone}:`, 'g')) ?? []).toHaveLength(3)
  })

  it.each([
    '--ch-ink:',
    '--ch-ink-muted:',
    '--ch-grid:',
    '--ch-surface:',
    '--ch-tooltip-bg:',
    '--ch-tooltip-ink:',
  ])('defines %s in all three theme blocks', (token) => {
    expect(themeBlocks.split(token).length - 1).toBe(3)
  })

  it('maps the color tokens onto system colors in forced-colors mode', () => {
    expect(FORCED_AT).toBeGreaterThan(0)
    const tokens = new Map(
      [...forced.matchAll(/(--ch-[\w-]+):\s*([A-Za-z]+);/g)].map((m) => [m[1], m[2]]),
    )
    expect(Object.fromEntries(tokens)).toEqual({
      '--ch-accent': 'Highlight',
      '--ch-accent-soft': 'GrayText',
      '--ch-loss': 'CanvasText',
      '--ch-warn': 'CanvasText',
      '--ch-gain': 'CanvasText',
      '--ch-neutral': 'GrayText',
      '--ch-ink': 'CanvasText',
      '--ch-ink-muted': 'GrayText',
      '--ch-grid': 'GrayText',
      '--ch-surface': 'Canvas',
      '--ch-tooltip-bg': 'Canvas',
      '--ch-tooltip-ink': 'CanvasText',
    })
    // Later than, and at least as specific as, every theme block it overrides.
    expect(forced).toMatch(
      /:root,\s*:root:not\(\[data-ch-theme="light"\]\),\s*\[data-ch-theme\] \{/,
    )
  })

  it('keeps runway cells, marks and the focused row visible in forced-colors mode', () => {
    for (const selector of [
      '[data-ch-part="runway-cell"]',
      '[data-ch-part="runway-cell"][data-ch-state="empty"]',
      '[data-ch-part="runway-dot"]',
      '[data-ch-part="runway-reset"]',
      '[data-ch-part="runway-row"][data-ch-selected="true"]',
      '[data-ch-part="runway-rows"]:focus-visible [data-ch-part="runway-row"][data-ch-focus="true"] {\n    outline: 2px solid Highlight;',
    ]) {
      expect(forced).toContain(selector)
    }
  })

  it('puts the runway rules before the forced-colors block', () => {
    expect(css.indexOf('/* ---------- Runway ---------- */')).toBeLessThan(FORCED_AT)
    expect(css.lastIndexOf('/* ---------- Forced colors')).toBeGreaterThan(
      css.indexOf('/* ---------- Runway ---------- */'),
    )
  })

  it('keeps runway text at 4.5:1 and empty-cell outlines at 3:1 against the surface', () => {
    const runway = css.slice(css.indexOf('/* ---------- Runway ---------- */'), FORCED_AT)
    const rule = (selector: string) => {
      const at = runway.indexOf(`${selector} {`)
      expect(at).toBeGreaterThanOrEqual(0)
      return runway.slice(at, runway.indexOf('}', at))
    }
    // A muted row is muted ink, not muted ink faded further.
    const muted = runway.slice(runway.indexOf('[data-ch-part="runway-row"][data-ch-muted="true"]'))
    expect(muted.slice(0, muted.indexOf('}'))).not.toMatch(/^\s*opacity:/m)
    expect(rule('[data-ch-part="runway-cell"][data-ch-state="empty"]')).not.toContain(
      'stroke-opacity',
    )
    // Muted text on a selected or hovered row: 5% ink keeps it at 4.56:1 in the light theme.
    for (const state of ['[data-ch-active="true"]', '[data-ch-selected="true"]']) {
      const share = rule(`[data-ch-part="runway-row"]${state}`).match(/var\(--ch-ink\) (\d+)%/)
      expect(Number(share?.[1])).toBeLessThanOrEqual(5)
    }
  })

  it('gives the runway reset label a surface halo, Canvas in forced colors', () => {
    const runway = css.slice(css.indexOf('/* ---------- Runway ---------- */'), FORCED_AT)
    expect(runway).toMatch(
      /\[data-ch-part="runway-reset-label"\] \{\s*paint-order: stroke;\s*stroke: var\(--ch-surface\);\s*stroke-width: 3px;\s*stroke-linejoin: round;/,
    )
    expect(forced).toMatch(/\[data-ch-part="runway-reset-label"\] \{\s*stroke: Canvas;/)
  })

  it('keeps HTML marks visible and levels distinct in forced-colors mode', () => {
    for (const part of [
      'legend-swatch',
      'meter-fill',
      'inline-bar-fill',
      'range-dot',
      'range-gap',
      'dot-count-dot',
    ]) {
      expect(forced).toMatch(
        new RegExp(`\\[data-ch-part="${part}"\\][^{]*\\{[^}]*forced-color-adjust: none`),
      )
    }
    for (const level of [2, 3, 4, 5]) {
      expect(forced).toContain(`)[data-ch-level="${level}"] {\n    border-width: ${level}px;`)
    }
    expect(forced).toMatch(/\.ch-svg text \{\s*fill: CanvasText;/)
    expect(forced).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: none;/,
    )
  })

  it('gives a focused heatmap cell a transparent outline that forced colors can paint', () => {
    expect(themed).toMatch(
      /\[data-ch-part="heatmap-cell"\]:focus-visible \{\s*outline: 2px solid transparent;\s*outline-offset: 2px;/,
    )
    // Not at rest: forced colors would paint a resting outline around every cell.
    expect(themed).toMatch(/\[data-ch-part="heatmap-cell"\] \{[^}]*outline: none;/)
  })

  it.each([
    '--ch-hatch-angle:',
    '--ch-hatch-width:',
    '--ch-hatch-gap:',
    '--ch-seq-5:',
    '--ch-duration:',
    '--ch-ease:',
    '--ch-dim-opacity:',
    '--ch-radius:',
    '--ch-font-numeric:',
    '--ch-tone-text-mix:',
  ])('defines %s', (token) => {
    expect(css).toContain(token)
  })

  it('keeps connectors, column highlights and areas out of pointer events', () => {
    const rule = css.match(/\[data-ch-part="bar"\],[\s\S]*?\{([^}]*)\}/)
    expect(rule?.[0]).toContain('[data-ch-part="column-highlight"]')
    expect(rule?.[0]).toContain('[data-ch-part="connector"]')
    expect(rule?.[0]).toContain('[data-ch-part="area"]')
    expect(rule?.[0]).toContain('[data-ch-part="dot"]')
    expect(rule?.[0]).toContain('[data-ch-part="dot-ring"]')
    expect(rule?.[0]).toContain('[data-ch-part="median"]')
    for (const part of ['line', 'line-dot', 'band', 'grid-line', 'region']) {
      expect(rule?.[0]).toContain(`[data-ch-part="${part}"]`)
    }
    expect(rule?.[1]).toContain('pointer-events: none')
  })

  it('lets the pointer rest on a hover tooltip but not on a pinned callout', () => {
    expect(css).toMatch(/\[data-ch-part="tooltip"\] \{\s*pointer-events: auto;/)
    expect(css).not.toMatch(/\[data-ch-part="callout"\][^{]*\{[^}]*pointer-events: auto/)
  })

  it('lets a chart shrink inside a grid or flex track', () => {
    expect(css).toMatch(/\.ch-svg \{[^}]*max-width: 100%;/)
  })

  it('sizes tooltips to their content and lets a capped pill wrap', () => {
    expect(css).toMatch(/\.ch-tooltip \{[^}]*width: max-content;/)
    const pill = css.match(/\[data-ch-part="tooltip-pill"\] \{([^}]*)\}/)?.[1] ?? ''
    expect(pill).toContain('flex-wrap: wrap')
    expect(pill).toContain('max-width: 100%')
    expect(pill).not.toContain('white-space: nowrap')
  })

  it('disables motion for reduced-motion users', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })

  it('paints medians and their labels in the inked tone mix, like tinted text', () => {
    const mix = 'color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    expect(css).toMatch(
      /\[data-ch-part="median"\] \{[^}]*stroke: color-mix\(in srgb, var\(--_ch-swatch-color\) var\(--ch-tone-text-mix\), var\(--ch-ink\)\)/,
    )
    expect(css).toMatch(/\[data-ch-part="median-label"\] \{[^}]*fill: color-mix/)
    expect(css).toContain(mix)
  })

  it('builds the sequential levels from an inherited base on charts, legends, heatmaps and runways', () => {
    const base = 'var(--ch-seq-base, var(--ch-loss))'
    expect(SEQ.get('--ch-seq-1')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-1, 12%), var(--ch-surface))`,
    )
    expect(SEQ.get('--ch-seq-4')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-4, var(--_ch-seq-loss-4)), var(--ch-surface))`,
    )
    expect(SEQ.get('--ch-seq-5')).toBe(
      `color-mix(in srgb, ${base} var(--ch-seq-mix-5, var(--_ch-seq-loss-5)), #000)`,
    )
    // A default base or default shares would stop an ancestor's values from reaching the levels:
    // only the data-ch-seq-tone rules set them.
    const rules = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    for (const [, selector, body] of rules) {
      if (/--ch-seq-base:|--ch-seq-mix-\d:/.test(body ?? '')) {
        const bare = (selector ?? '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
        expect(bare).toMatch(/^\[data-ch-seq-tone="[a-z-]+"\]$/)
      }
    }
  })

  it('keys a base and the level shares for every tone on data-ch-seq-tone', () => {
    for (const tone of TONES) {
      const rule = declarations(new RegExp(`\\[data-ch-seq-tone="${tone}"\\]`))
      expect(rule.get('--ch-seq-base')).toContain(`var(--ch-${tone})`)
      for (const level of [2, 3, 4, 5]) {
        expect(rule.get(`--ch-seq-mix-${level}`)).toBe(`var(--_ch-seq-${tone}-${level})`)
      }
    }
    // Without a tone the ramp is loss's.
    for (const theme of ['light', 'dark'] as const) {
      expect(ramp(theme)).toEqual(ramp(theme, 'loss'))
    }
  })

  it('makes the dark top level the pure base, with dark text, and the light one darker, with white', () => {
    for (const tone of TONES) {
      expect(ramp('dark', tone)[4]).toEqual(hex(THEMES.dark.get(`--ch-${tone}`)))
    }
    expect(THEMES.light.get('--_ch-seq-ink-strong')).toBe('#fff')
    expect(THEMES.dark.get('--_ch-seq-ink-strong')).toBe('var(--ch-surface)')
    // The loss ramp tops out at the hot pink of the reference, darkened only for white text.
    expect(toHex(ramp('light', 'loss')[4] as Rgb)).toBe('#d33282')
  })

  it('outlines the two lightest levels in the light theme only', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]:is\(\[data-ch-level="1"\], \[data-ch-level="2"\]\),\s*\[data-ch-part="legend-swatch"\]:is\(\[data-ch-level="1"\], \[data-ch-level="2"\]\) \{\s*box-shadow: inset 0 0 0 var\(--_ch-seq-outline\)\s+color-mix\(in srgb, var\(--ch-seq-base, var\(--ch-loss\)\) 45%, var\(--ch-surface\)\)/,
    )
    expect(THEMES.light.get('--_ch-seq-outline')).toBe('1px')
    expect(THEMES.dark.get('--_ch-seq-outline')).toBe('0px')
  })

  it('puts white text only on the darkest heatmap level', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-level="5"\] \{[^}]*color: var\(--_ch-seq-ink-strong\)/,
    )
    expect(css).toMatch(/\[data-ch-part="heatmap-cell"\] \{[^}]*color: var\(--ch-ink\)/)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{[^}]*\[data-ch-part="heatmap"\] \*/,
    )
  })

  it('keeps heatmap columns at least a minimum cell wide and scrolls the grid instead', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\] \{[^}]*min-width: var\(--ch-heatmap-min-cell, 56px\);/,
    )
    expect(css).toMatch(
      /\[data-ch-part="heatmap-grid"\] \{[^}]*grid-template-columns: max-content repeat\(var\(--_ch-heatmap-columns\), 1fr\);/,
    )
    expect(css).toMatch(/\[data-ch-part="heatmap-scroll"\] \{[^}]*overflow-x: auto;/)
    // minmax(0, 1fr) let names and values overlap at 320px (A11Y-8).
    expect(css).not.toContain('minmax(0, 1fr)')
  })

  it('lets the top heatmap cell glow in the base color, except under reduced transparency', () => {
    expect(css).toMatch(
      /\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: [^;]*color-mix\(in srgb, var\(--ch-seq-base, var\(--ch-loss\)\)/,
    )
    expect(css).toMatch(
      /@media \(prefers-reduced-transparency: reduce\) \{\s*\[data-ch-part="heatmap-cell"\]\[data-ch-peak="true"\] \{\s*box-shadow: none;/,
    )
  })

  it('keeps the light 1px outline on a glowing level 1 or 2 cell, with or without the glow', () => {
    // Whitespace-insensitive: the formatter may wrap a long selector.
    const flat = css.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')')
    const peakLow =
      '[data-ch-part="heatmap-cell"][data-ch-peak="true"]:where([data-ch-level="1"], [data-ch-level="2"])'
    const outline =
      'inset 0 0 0 var(--_ch-seq-outline) color-mix(in srgb, var(--ch-seq-base, var(--ch-loss)) 45%, var(--ch-surface))'
    // Outline first, then the glow; :where keeps it under the active and focus rules after it.
    expect(flat).toContain(`${peakLow} { box-shadow: ${outline}, 0 6px 18px -6px`)
    expect(flat.indexOf(peakLow)).toBeLessThan(
      flat.indexOf('[data-ch-part="heatmap-cell"][data-ch-active="true"] {'),
    )
    // Under reduced transparency only the outline is left.
    const reduced = flat.slice(flat.indexOf('@media (prefers-reduced-transparency: reduce)'))
    expect(reduced.slice(0, reduced.indexOf('} }') + 3)).toContain(
      `${peakLow} { box-shadow: ${outline}; }`,
    )
  })

  it('draws band swatches with the band fill and line markers like the series points', () => {
    const bandFill = 'color-mix(in srgb, var(--_ch-swatch-color) 18%, transparent)'
    expect(css).toContain(`[data-ch-part="band"] {\n  fill: ${bandFill};`)
    expect(css).toContain(
      `[data-ch-part="legend-swatch"][data-ch-shape="band"] {\n  background: ${bandFill};`,
    )
    expect(css).toMatch(
      /\[data-ch-marker="ring"\]::after \{\s*border: 2px solid var\(--_ch-swatch-color\);\s*background: var\(--ch-surface\);/,
    )
  })

  it('paints toned text through one shared rule that mixes the tone with ink', () => {
    const inkMix =
      'color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    const rule = css.match(/\n\[data-ch-tone-text\] \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain(`color: ${inkMix}`)
    expect(rule).toContain(`fill: ${inkMix}`)
    // No rule paints text in the raw tone any more.
    expect(css).not.toMatch(/(?:^|[;{\s])(?:color|fill): var\(--_ch-swatch-color\)/)
    expect(css).not.toContain('.ch-tone-text')
  })

  it('keeps the forced-colors block last, so nothing after it can undo it', () => {
    // After the media block's closing brace only whitespace remains: no top-level rule follows.
    let depth = 0
    let end = -1
    for (let i = css.indexOf('{', FORCED_AT); i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}' && --depth === 0) {
        end = i
        break
      }
    }
    expect(end).toBeGreaterThan(FORCED_AT)
    expect(
      css
        .slice(end + 1)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .trim(),
    ).toBe('')
  })

  it('scopes the legend marker rules to line swatches', () => {
    expect(css).not.toMatch(/\[data-ch-part="legend-swatch"\]\[data-ch-marker/)
    expect(css).toMatch(/\[data-ch-shape="line"\]\[data-ch-marker="ring"\]::after/)
  })

  it('insets an outline on hatched swatches, meter and inline bar fills and range gaps', () => {
    expect(css).toMatch(
      /\[data-ch-fill="hatch"\]:is\(\s*\[data-ch-part="legend-swatch"\],\s*\[data-ch-part="meter-fill"\],\s*\[data-ch-part="inline-bar-fill"\],\s*\[data-ch-part="range-gap"\],\s*\[data-ch-part="share-segment"\],\s*\[data-ch-part="share-swatch"\]\s*\),[^{]*\{\s*box-shadow: inset 0 0 0 1px\s+color-mix/,
    )
  })

  it('outlines hatched bars, soft-accent bars and dots, and hatched or soft swatches', () => {
    const outline =
      'stroke: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    const rule = css.match(/\[data-ch-part="bar"\]\[data-ch-fill="hatch"\],[^{]*\{([^}]*)\}/)
    expect(rule?.[0]).toContain('[data-ch-part="region"][data-ch-fill="hatch"]')
    expect(rule?.[0]).toContain('[data-ch-part="bar"][data-ch-tone="accent-soft"]')
    expect(rule?.[0]).toContain(
      '[data-ch-part="dot"][data-ch-tone="accent-soft"]:not([data-ch-soft])',
    )
    expect(rule?.[1]).toContain(outline)
    expect(rule?.[1]).toContain('stroke-width: 1px')
    expect(css).toMatch(
      /\[data-ch-part="legend-swatch"\]\[data-ch-tone="accent-soft"\]:not\(\[data-ch-shape="line"\]\) \{\s*box-shadow: inset 0 0 0 1px\s+color-mix/,
    )
  })

  it.each(TONE_MATRIX)(
    'keeps $tone text at 4.5:1 on the surface and the tooltip in the $theme theme',
    ({ theme, tone }) => {
      const text = inked(theme, tone)
      expect(contrast(text, hex(THEMES[theme].get('--ch-surface')))).toBeGreaterThanOrEqual(4.5)
      expect(contrast(text, hex(THEMES[theme].get('--ch-tooltip-bg')))).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(TONE_MATRIX)(
    'keeps $tone marks at 3:1 on the surface in the $theme theme',
    ({ theme, tone }) => {
      const surface = hex(THEMES[theme].get('--ch-surface'))
      // The outline of soft and hatched marks carries 3:1 for every tone.
      expect(contrast(inked(theme, tone), surface)).toBeGreaterThanOrEqual(3)
      // accent-soft keeps its soft fill (it means "estimate"); every other tone is a solid mark.
      if (tone !== 'accent-soft') {
        expect(contrast(hex(THEMES[theme].get(`--ch-${tone}`)), surface)).toBeGreaterThanOrEqual(3)
      }
    },
  )

  it('darkens the light warn, gain and neutral marks to the spec values', () => {
    expect(THEMES.light.get('--ch-warn')).toBe('#be802f')
    expect(THEMES.light.get('--ch-gain')).toBe('#22a363')
    expect(THEMES.light.get('--ch-neutral')).toBe('#8e8e95')
  })

  describe('data-ch-palette="vivid"', () => {
    const palette = themed.slice(PALETTE_AT)
    const rules = [...palette.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
      selector: (m[1] ?? '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim(),
      body: m[2] ?? '',
    }))

    it('sits between the theme blocks and the forced-colors block', () => {
      expect(PALETTE_AT).toBeGreaterThan(css.indexOf('[data-ch-theme="dark"] {'))
      expect(PALETTE_AT).toBeLessThan(FORCED_AT)
      expect(rules.length).toBeGreaterThan(0)
    })

    it('restores the pre-0.6b warn, gain and neutral and nothing else', () => {
      for (const { body } of rules) {
        const props = Object.fromEntries(
          [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]]),
        )
        expect(props).toEqual({
          '--ch-warn': '#f1a23b',
          '--ch-gain': '#23a866',
          '--ch-neutral': '#a3a3ab',
        })
      }
    })

    it('covers a light theme on, under and above the palette, and the system theme', () => {
      const selectors = rules.map((r) => r.selector).join(' | ')
      expect(selectors).toContain(':where([data-ch-palette="vivid"])[data-ch-theme="light"]')
      expect(selectors).toContain(':where([data-ch-palette="vivid"]) [data-ch-theme="light"]')
      expect(selectors).toContain('[data-ch-theme="light"] :where([data-ch-palette="vivid"]')
      expect(selectors).toMatch(/:not\(\[data-ch-theme\], \[data-ch-theme\] \*\)/)
      // The system rule is for light only: a dark system keeps the dark tokens.
      expect(palette).toMatch(/@media not \(prefers-color-scheme: dark\)/)
    })

    it('steps aside under forced colors, which map tokens only on :root and theme elements', () => {
      expect(palette).toMatch(/@media not \(forced-colors: active\) \{/)
      // Every vivid rule sits inside that guard.
      const guard = palette.indexOf('@media not (forced-colors: active)')
      expect(guard).toBeLessThan(palette.indexOf('--ch-warn'))
      const bare = palette.replace(/\/\*[\s\S]*?\*\//g, '').trim()
      expect(bare.startsWith('@media not (forced-colors: active) {')).toBe(true)
      expect(bare.endsWith('}')).toBe(true)
    })

    it('never selects a dark theme', () => {
      expect(palette).not.toContain('data-ch-theme="dark"')
    })
  })

  it('declares the same dark tokens for the system preference and the forced theme', () => {
    const system = declarations(/:root:not\(\[data-ch-theme="light"\]\)/)
    expect(system.size).toBeGreaterThan(0)
    expect(system).toEqual(THEMES.dark)
  })

  it.each(MATRIX)(
    'keeps heatmap text at 4.5:1 on $tone level $level in the $theme theme',
    ({ theme, tone, level }) => {
      const env = seqEnv(theme, tone)
      const background = ramp(theme, tone)[level - 1] as Rgb
      // Levels 1–4 inherit the cell's --ch-ink; level 5 switches to --_ch-seq-ink-strong.
      const ink = level === 5 ? '--_ch-seq-ink-strong' : '--ch-ink'
      const text = hex(resolve(env.get(ink) ?? '', env))
      expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it.each(STEP_MATRIX)(
    'sets $tone level $level apart from the next by 1.3:1 in the $theme theme',
    ({ theme, tone, level }) => {
      const levels = ramp(theme, tone)
      expect(contrast(levels[level - 1] as Rgb, levels[level] as Rgb)).toBeGreaterThanOrEqual(1.3)
    },
  )

  it.each(TONE_MATRIX)(
    'keeps the $tone level 5 at 3:1 on the surface in the $theme theme',
    ({ theme, tone }) => {
      const surface = hex(THEMES[theme].get('--ch-surface'))
      expect(contrast(ramp(theme, tone)[4] as Rgb, surface)).toBeGreaterThanOrEqual(3)
    },
  )
})
