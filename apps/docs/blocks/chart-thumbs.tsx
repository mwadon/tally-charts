import type { ReactNode } from 'react'

/*
 * Small decorative drawings of the chart types, for the tiles of the chart index. They are not
 * charts: plain SVG shapes colored by the `ct-*` classes of globals.css (tokens `--ch-*`), so
 * they follow the theme. Free of server code: the editor registry imports this module.
 */

export const thumbNames = [
  'bar-chart',
  'comparison-bars',
  'ranked-bars',
  'waterfall-chart',
  'bridge-chart',
  'dot-histogram',
  'strip-plot',
  'waffle-columns',
  'line-chart',
  'heatmap',
  'runway-chart',
  'small-pieces',
] as const

export type ThumbName = (typeof thumbNames)[number]

/** `fill` values of the hatch patterns of one `ThumbDefs`. */
interface Hatches {
  accent: string
  loss: string
  neutral: string
}

const TONES = ['accent', 'loss', 'neutral'] as const

/** The hatch patterns the thumbnails share; render once, before the thumbnails that use `id`. */
export function ThumbDefs({ id }: { id: string }) {
  return (
    <svg className="chart-thumb-defs" width="0" height="0" aria-hidden="true" focusable="false">
      <defs>
        {TONES.map((tone) => (
          <pattern
            key={tone}
            id={`${id}-${tone}`}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect className={`ct-${tone} ct-tint`} width="5" height="5" />
            <rect className={`ct-${tone}`} width="1.3" height="5" />
          </pattern>
        ))}
      </defs>
    </svg>
  )
}

const dots = (cls: string, points: readonly (readonly [number, number])[], r: number) =>
  points.map(([cx, cy]) => <circle key={`${cx},${cy}`} className={cls} cx={cx} cy={cy} r={r} />)

const cells = (
  cls: string,
  rects: readonly (readonly [number, number])[],
  width: number,
  height: number,
) =>
  rects.map(([x, y]) => (
    <rect key={`${x},${y}`} className={cls} x={x} y={y} width={width} height={height} />
  ))

/** Dots of a histogram column: `count` dots stacked up from the baseline. */
const column = (x: number, count: number) =>
  Array.from({ length: count }, (_, i) => [x, 48 - i * 8] as const)

/** Squares of a waffle column, stacked up from the baseline. */
const stack = (x: number, count: number) =>
  Array.from({ length: count }, (_, i) => [x, 43 - i * 9] as const)

const HEAT = [0.95, 0.5, 0.3, 0.5, 0.3, 0.15, 0.7, 0.15, 0.3] as const

const THUMBS: Record<ThumbName, (h: Hatches) => ReactNode> = {
  'bar-chart': (h) => (
    <>
      <rect x="10" y="32" width="12" height="18" fill={h.accent} />
      <rect x="28" y="26" width="12" height="24" fill={h.accent} />
      <rect x="46" y="22" width="12" height="28" fill={h.accent} />
      <rect x="64" y="28" width="12" height="22" fill={h.accent} />
      <rect x="82" y="18" width="12" height="32" fill={h.accent} />
      <rect className="ct-accent" x="100" y="10" width="12" height="40" />
    </>
  ),
  'comparison-bars': (h) => (
    <>
      <rect x="10" y="20" width="12" height="30" fill={h.accent} />
      <rect className="ct-accent" x="24" y="24" width="12" height="26" />
      <rect x="47" y="16" width="12" height="34" fill={h.accent} />
      <rect className="ct-accent" x="61" y="14" width="12" height="36" />
      <rect x="84" y="12" width="12" height="38" fill={h.accent} />
      <rect className="ct-loss" x="98" y="22" width="12" height="28" />
    </>
  ),
  'ranked-bars': () => (
    <>
      <rect className="ct-accent" x="10" y="6" width="100" height="8" />
      <rect className="ct-soft" x="10" y="19" width="74" height="8" />
      <rect className="ct-soft" x="10" y="32" width="52" height="8" />
      <rect className="ct-soft" x="10" y="45" width="30" height="8" />
    </>
  ),
  'waterfall-chart': (h) => (
    <>
      <rect x="10" y="8" width="14" height="42" fill={h.neutral} />
      <rect x="31" y="8" width="14" height="12" fill={h.loss} />
      <rect x="52" y="20" width="14" height="9" fill={h.loss} />
      <rect x="73" y="29" width="14" height="6" fill={h.loss} />
      <rect className="ct-accent" x="96" y="35" width="14" height="15" />
    </>
  ),
  'bridge-chart': (h) => (
    <>
      <rect x="10" y="8" width="22" height="42" fill={h.accent} />
      <rect x="49" y="8" width="22" height="26" fill={h.loss} />
      <rect x="49" y="34" width="22" height="16" fill={h.accent} />
      <rect className="ct-accent" x="88" y="34" width="22" height="16" />
    </>
  ),
  'dot-histogram': () => (
    <>
      {dots('ct-loss', [...column(18, 1), ...column(32, 2)], 3.2)}
      {dots(
        'ct-accent',
        [...column(46, 4), ...column(60, 5), ...column(74, 3), ...column(88, 2), ...column(102, 1)],
        3.2,
      )}
    </>
  ),
  'strip-plot': () => (
    <>
      <path className="ct-rule" d="M10 14h100M10 30h100M10 46h100" />
      {dots(
        'ct-accent',
        [
          [30, 14],
          [40, 14],
          [46, 14],
          [58, 14],
          [78, 14],
          [22, 30],
          [50, 30],
          [56, 30],
          [64, 30],
        ],
        3,
      )}
      {dots(
        'ct-loss',
        [
          [62, 46],
          [74, 46],
          [80, 46],
          [88, 46],
          [102, 46],
        ],
        3,
      )}
    </>
  ),
  'waffle-columns': () => (
    <>
      {cells('ct-soft', [...stack(14, 3), ...stack(40, 4), ...stack(66, 3)], 14, 7)}
      {cells('ct-loss', stack(92, 5), 14, 7)}
    </>
  ),
  'line-chart': () => (
    <>
      <path className="ct-accent ct-tint" d="M70 26L110 6v26z" />
      <path className="ct-stroke" d="M10 40l15-8 15 6 15-14 15 2" />
      <path className="ct-stroke ct-dashed" d="M70 26l40-8" />
      <circle className="ct-accent" cx="70" cy="26" r="3" />
    </>
  ),
  heatmap: () => (
    <>
      {HEAT.map((opacity, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid; the position is the identity
          key={i}
          className="ct-loss"
          x={10 + (i % 3) * 34}
          y={6 + Math.floor(i / 3) * 16}
          width="30"
          height="13"
          rx="2"
          fillOpacity={opacity}
        />
      ))}
    </>
  ),
  'runway-chart': (h) => (
    <>
      <rect x="10" y="7" width="100" height="10" fill={h.neutral} />
      <rect className="ct-neutral" x="10" y="7" width="58" height="10" />
      <rect x="10" y="23" width="100" height="10" fill={h.loss} />
      <rect className="ct-loss" x="10" y="23" width="82" height="10" />
      <rect x="10" y="39" width="100" height="10" fill={h.neutral} />
      <rect className="ct-neutral" x="10" y="39" width="34" height="10" />
      <path className="ct-mark ct-dashed" d="M76 3v50" />
    </>
  ),
  'small-pieces': () => (
    <>
      <path className="ct-stroke" d="M10 22l12-6 12 4 12-10 12 6" />
      <rect className="ct-track" x="10" y="38" width="100" height="8" rx="2" />
      <rect className="ct-accent" x="10" y="38" width="62" height="8" rx="2" />
      <path className="ct-mark" d="M86 34v16" />
    </>
  ),
}

/** The drawing of one chart type; `defs` is the `id` of a `ThumbDefs` rendered on the same page. */
export function ChartThumb({ name, defs }: { name: ThumbName; defs: string }) {
  const hatches: Hatches = {
    accent: `url(#${defs}-accent)`,
    loss: `url(#${defs}-loss)`,
    neutral: `url(#${defs}-neutral)`,
  }
  return (
    <svg className="chart-thumb" viewBox="0 0 120 56" aria-hidden="true" focusable="false">
      {THUMBS[name](hatches)}
    </svg>
  )
}
