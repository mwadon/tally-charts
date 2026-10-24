import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'

const css = readFileSync(
  path.join(import.meta.dirname, '../../../packages/tally-charts/src/theme/theme.css'),
  'utf8',
)

/** Hex token values declared in the first block that starts with `selector`. */
function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`no block for ${selector}`)
  const block = css.slice(start, css.indexOf('}', start))
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--ch-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi))
    out[m[1] as string] = m[2] as string
  return out
}

const channel = (hex: string, i: number) => {
  const v = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const luminance = (hex: string) =>
  0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2)
function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const themes = {
  light: tokens('[data-ch-theme="light"]'),
  dark: tokens('[data-ch-theme="dark"]'),
}

// The page's backgrounds are --ch-surface (page) and --ch-tooltip-bg (raised cards, code blocks).
const backgrounds = ['surface', 'tooltip-bg'] as const

for (const [theme, t] of Object.entries(themes)) {
  for (const bg of backgrounds) {
    for (const fg of ['ink', 'ink-muted'] as const) {
      test(`${fg} on ${bg} is at least 4.5:1 (${theme})`, () => {
        expect(contrast(t[fg] as string, t[bg] as string)).toBeGreaterThanOrEqual(4.5)
      })
    }
    // The focus ring and control borders (ink-muted) are non-text UI: 3:1.
    test(`the focus ring (accent) on ${bg} is at least 3:1 (${theme})`, () => {
      expect(contrast(t.accent as string, t[bg] as string)).toBeGreaterThanOrEqual(3)
    })
    test(`control borders (ink-muted) on ${bg} are at least 3:1 (${theme})`, () => {
      expect(contrast(t['ink-muted'] as string, t[bg] as string)).toBeGreaterThanOrEqual(3)
    })
  }
}

test('pure accent as text on the light surface stays below 4.5:1, so links mix it with ink', () => {
  const light = themes.light
  expect(contrast(light.accent as string, light.surface as string)).toBeLessThan(4.5)
})
