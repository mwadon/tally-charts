import { ImageResponse } from 'next/og'
import { OG_IMAGE, SITE_NAME, SITE_TAGLINE } from '../lib/metadata'

export const alt = OG_IMAGE.alt
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height }
export const contentType = 'image/png'

// The image renderer has no CSS variables, so these repeat the light values of the tokens in
// tally-charts/theme.css: --ch-surface, --ch-ink, --ch-ink-muted, --ch-accent, --ch-accent-soft.
const SURFACE = '#fafafa'
const INK = '#111114'
const MUTED = '#6b6b73'
const ACCENT = '#2f6bf0'
const ACCENT_SOFT = '#9dbcf6'

/** Bar heights in px; the last two are the forecast, drawn in the soft accent. */
const BARS = [150, 210, 180, 260, 240, 320, 370]
const FORECAST_FROM = 5

/**
 * The preview image of every page (1200×630): the site name, the tagline and a row of bars. It
 * uses no request data, so `next build` renders it once to a static file.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        padding: 80,
        background: SURFACE,
        color: INK,
      }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', width: 620 }}
      >
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div
          style={{ display: 'flex', marginTop: 28, fontSize: 38, lineHeight: 1.3, color: MUTED }}
        >
          {SITE_TAGLINE}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 18, paddingBottom: 40 }}>
        {BARS.map((height, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of bars
            key={i}
            style={{
              display: 'flex',
              width: 40,
              height,
              borderRadius: 6,
              background: i < FORECAST_FROM ? ACCENT : ACCENT_SOFT,
            }}
          />
        ))}
      </div>
    </div>,
    size,
  )
}
