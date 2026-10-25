import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'
import { contrast } from '../lib/contrast'
import { PALETTES } from '../tokens.generated'
import { PaletteSwatches, paletteSwatchesSchema } from './palette-swatches'

const tones = ['accent', 'accent-soft', 'loss', 'warn', 'gain', 'neutral'] as const
const ratio = (a: string, b: string) => `${contrast(a, b).toFixed(2)}:1`

function swatchOf(tone: string) {
  const item = screen.getByText(`--ch-${tone}`).closest('li') as HTMLElement
  return within(item)
}

test('default: a swatch per tone with its name, hex and contrast in both themes', () => {
  render(<PaletteSwatches palette="default" />)

  expect(screen.getAllByRole('listitem')).toHaveLength(tones.length)
  for (const tone of tones) {
    const item = swatchOf(tone)
    const { light, dark, surface } = PALETTES.default
    expect(item.getByText(light[tone]), tone).toBeTruthy()
    expect(item.getByText(dark?.[tone] as string), tone).toBeTruthy()
    expect(item.getByText(ratio(light[tone], surface.light)), tone).toBeTruthy()
    expect(item.getByText(ratio(dark?.[tone] as string, surface.dark as string)), tone).toBeTruthy()
  }
})

test('the contrast of accent on the light surface is the WCAG ratio of #2f6bf0 and #fafafa', () => {
  render(<PaletteSwatches palette="default" />)

  expect(swatchOf('accent').getByText(ratio('#2f6bf0', '#fafafa'))).toBeTruthy()
})

test('swatches are literal colors and hidden from assistive technology', () => {
  const { container } = render(<PaletteSwatches palette="default" />)

  const swatches = container.querySelectorAll<HTMLElement>('.swatch')
  expect(swatches).toHaveLength(tones.length * 2)
  for (const swatch of swatches) {
    expect(swatch.getAttribute('aria-hidden')).toBe('true')
    expect(swatch.getAttribute('style')).not.toContain('var(')
  }
})

test('vivid: warn is #f1a23b and only the light theme is shown', () => {
  const { container } = render(<PaletteSwatches palette="vivid" />)

  const warn = swatchOf('warn')
  expect(warn.getByText('#f1a23b')).toBeTruthy()
  expect(warn.getByText(ratio('#f1a23b', '#fafafa'))).toBeTruthy()
  expect(warn.queryByText('Dark')).toBeNull()
  expect(container.querySelectorAll('.swatch')).toHaveLength(tones.length)
  expect(screen.getByText(/light only/i)).toBeTruthy()
})

test('default does not say light only', () => {
  render(<PaletteSwatches palette="default" />)

  expect(screen.queryByText(/light only/i)).toBeNull()
})

test('schema accepts the two palettes and rejects others', () => {
  expect(paletteSwatchesSchema.safeParse({ palette: 'default' }).success).toBe(true)
  expect(paletteSwatchesSchema.safeParse({ palette: 'vivid' }).success).toBe(true)
  expect(paletteSwatchesSchema.safeParse({ palette: 'neon' }).success).toBe(false)
  expect(paletteSwatchesSchema.safeParse({}).success).toBe(false)
})
