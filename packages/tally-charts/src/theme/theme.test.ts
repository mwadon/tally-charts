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
  /\[data-ch-root\],\s*\[data-ch-part="legend"\],\s*\[data-ch-part="heatmap"\]/,
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

describe('theme.css', () => {
  it.each(TONES)('defines --ch-%s for light, system dark and forced dark', (tone) => {
    expect(css.match(new RegExp(`--ch-${tone}:`, 'g')) ?? []).toHaveLength(3)
  })

  it.each([
    '--ch-ink:',
    '--ch-ink-muted:',
    '--ch-grid:',
    '--ch-surface:',
    '--ch-tooltip-bg:',
    '--ch-tooltip-ink:',
  ])('defines %s in all three theme blocks', (token) => {
    expect(css.split(token).length - 1).toBe(3)
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

  it('builds the sequential levels from an inherited base on charts, legends and heatmaps', () => {
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

  it('outlines hatched bars, soft-accent bars and dots, and hatched or soft swatches', () => {
    const outline =
      'stroke: color-mix(in srgb, var(--_ch-swatch-color) var(--ch-tone-text-mix), var(--ch-ink))'
    const rule = css.match(/\[data-ch-part="bar"\]\[data-ch-fill="hatch"\],[^{]*\{([^}]*)\}/)
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
