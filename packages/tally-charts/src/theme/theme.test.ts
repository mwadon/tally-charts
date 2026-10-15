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

/** Share of the base and the color it mixes into, for one level under one tone. */
function levelMix(tone: string, level: number): { share: number; into: string } {
  const formula = SEQ.get(`--ch-seq-${level}`) ?? ''
  const parsed = formula.match(
    new RegExp(
      `(?:var\\(--ch-seq-mix-${level}, (\\d+)%\\)|(\\d+)%), (var\\(--ch-surface\\)|#000)\\)$`,
    ),
  )
  expect(parsed, formula).not.toBeNull()
  const override = declarations(new RegExp(`\\[data-ch-seq-tone="${tone}"\\]`)).get(
    `--ch-seq-mix-${level}`,
  )
  const share = override ?? parsed?.[1] ?? parsed?.[2] ?? ''
  return { share: Number.parseFloat(share) / 100, into: parsed?.[3] ?? '' }
}

const MATRIX = (Object.keys(THEMES) as (keyof typeof THEMES)[]).flatMap((theme) =>
  TONES.flatMap((tone) => LEVELS.map((level) => ({ theme, tone, level }))),
)

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
      `color-mix(in srgb, ${base} var(--ch-seq-mix-4, 65%), var(--ch-surface))`,
    )
    expect(SEQ.get('--ch-seq-5')).toBe(`color-mix(in srgb, ${base} var(--ch-seq-mix-5, 75%), #000)`)
    expect(SEQ.get('--_ch-seq-ink-strong')).toBe('#fff')
    // A default base or default shares would stop an ancestor's values from reaching the levels.
    expect(css).not.toMatch(/--ch-seq-base:/)
    expect(css).not.toMatch(
      /(:root|\[data-ch-part="heatmap"\]|\[data-ch-part="legend"\])[^{]*\{[^}]*--ch-seq-mix-\d:/,
    )
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

  it('declares the same dark tokens for the system preference and the forced theme', () => {
    const system = declarations(/:root:not\(\[data-ch-theme="light"\]\)/)
    expect(system.size).toBeGreaterThan(0)
    expect(system).toEqual(THEMES.dark)
  })

  it.each(MATRIX)(
    'keeps heatmap text at 4.5:1 on $tone level $level in the $theme theme',
    ({ theme, tone, level }) => {
      const tokens = THEMES[theme]
      const { share, into } = levelMix(tone, level)
      const background = mix(
        hex(tokens.get(`--ch-${tone}`)),
        share,
        into === '#000' ? [0, 0, 0] : hex(tokens.get('--ch-surface')),
      )
      // Levels 1–4 inherit the cell's --ch-ink; level 5 switches to --_ch-seq-ink-strong.
      const text = level === 5 ? hex(SEQ.get('--_ch-seq-ink-strong')) : hex(tokens.get('--ch-ink'))
      expect(contrast(background, text)).toBeGreaterThanOrEqual(4.5)
    },
  )
})
