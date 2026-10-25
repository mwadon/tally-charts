import { defineBlock } from '@glokki-cms/sdk'
import { z } from 'zod'
import { formatContrast } from '../lib/contrast'
import { PALETTES, type PaletteTone } from '../tokens.generated'

export const paletteSwatchesSchema = z.object({
  palette: z.enum(['default', 'vivid']),
})

export type PaletteSwatchesProps = z.infer<typeof paletteSwatchesSchema>

const TONES: readonly PaletteTone[] = ['accent', 'accent-soft', 'loss', 'warn', 'gain', 'neutral']

/**
 * The tone colors with their contrast to `--ch-surface` of the same theme. The swatches are
 * literal colors, not `var()`, because the page shows a specific palette whatever its own theme.
 */
export function PaletteSwatches({ palette }: PaletteSwatchesProps) {
  const { light, dark, surface } = PALETTES[palette]
  const themes = [
    { label: 'Light', colors: light, surface: surface.light },
    ...(dark === undefined || surface.dark === undefined
      ? []
      : [{ label: 'Dark', colors: dark, surface: surface.dark }]),
  ]

  return (
    <>
      <ul className="swatches" aria-label={`${palette} palette`}>
        {TONES.map((tone) => (
          <li key={tone}>
            <code className="swatch-name">{`--ch-${tone}`}</code>
            <dl>
              {themes.map((theme) => {
                const color = theme.colors[tone]
                return (
                  <div key={theme.label} style={{ display: 'contents' }}>
                    <dt>{theme.label}</dt>
                    <dd>
                      <span className="swatch" aria-hidden="true" style={{ background: color }} />
                      <code>{color}</code>
                      <span>{formatContrast(color, theme.surface)}</span>
                    </dd>
                  </div>
                )
              })}
            </dl>
          </li>
        ))}
      </ul>
      <p className="small">
        {themes.length === 1 ? 'Light only: the palette does not change the dark theme. ' : ''}
        Contrast is against <code>--ch-surface</code> of the same theme.
      </p>
    </>
  )
}

export const paletteSwatchesBlock = defineBlock({
  type: 'palette-swatches',
  label: 'Palette swatches',
  category: 'content',
  icon: 'palette',
  description: 'The tone colors of a palette with their contrast to the surface.',
  defaultProps: { palette: 'default' },
  propsSchema: paletteSwatchesSchema,
  component: PaletteSwatches,
})
