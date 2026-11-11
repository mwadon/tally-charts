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
  Array.from({ length: count }, (_, i) => [x, 50 - i * 12] as const)

/** Squares of a waffle column, stacked up from the baseline. */
const stack = (x: number, count: number) =>
  Array.from({ length: count }, (_, i) => [x, 40 - i * 15] as const)

const HEAT = [0.15, 0.5, 0.25, 0.1, 0.5, 1, 0.75, 0.25, 0.1, 0.5, 0.25, 0.1] as const

const THUMBS: Record<ThumbName, ReactNode> = {
  'bar-chart': (
    <>
      <rect className="ct-accent" x="10" y="24" width="15" height="26" />
      <rect className="ct-accent" x="31" y="12" width="15" height="38" />
      <rect className="ct-accent" x="52" y="20" width="15" height="30" />
      <rect className="ct-loss" x="73" y="34" width="15" height="16" />
      <rect className="ct-accent" x="94" y="6" width="15" height="44" />
    </>
  ),
  'comparison-bars': (
    <>
      <rect className="ct-plan" x="12" y="18" width="18" height="32" />
      <rect className="ct-accent" x="33" y="26" width="18" height="24" />
      <rect className="ct-plan" x="68" y="10" width="18" height="40" />
      <rect className="ct-accent" x="89" y="4" width="18" height="46" />
    </>
  ),
  'ranked-bars': (
    <>
      <rect className="ct-accent" x="10" y="4" width="100" height="9" />
      <rect className="ct-accent" x="10" y="18" width="76" height="9" />
      <rect className="ct-accent" x="10" y="32" width="52" height="9" />
      <rect className="ct-gain ct-half" x="10" y="46" width="30" height="9" />
    </>
  ),
  'waterfall-chart': (
    <>
      <rect className="ct-accent" x="10" y="6" width="16" height="44" />
      <rect className="ct-loss" x="32" y="6" width="16" height="14" />
      <rect className="ct-loss" x="54" y="20" width="16" height="10" />
      <rect className="ct-gain" x="76" y="16" width="16" height="14" />
      <rect className="ct-accent" x="98" y="16" width="16" height="34" />
    </>
  ),
  'bridge-chart': (
    <>
      <rect className="ct-plan" x="10" y="6" width="22" height="44" />
      <rect className="ct-loss" x="38" y="6" width="22" height="16" />
      <rect className="ct-loss" x="66" y="22" width="22" height="12" />
      <rect className="ct-accent" x="94" y="34" width="20" height="16" />
    </>
  ),
  'dot-histogram': (
    <>
      {dots('ct-loss', [...column(18, 1), ...column(36, 2)], 4.5)}
      {dots('ct-accent', [...column(54, 4), ...column(72, 3)], 4.5)}
      {dots('ct-gain', column(90, 1), 4.5)}
    </>
  ),
  'strip-plot': (
    <>
      <path className="ct-rule" d="M8 10h104M8 28h104M8 46h104" />
      {dots(
        'ct-accent',
        [
          [24, 10],
          [50, 10],
          [62, 10],
          [36, 28],
          [76, 28],
          [102, 28],
          [46, 46],
          [90, 46],
        ],
        4.5,
      )}
      {dots('ct-loss', [[18, 46]], 4.5)}
    </>
  ),
  'waffle-columns': (
    <>
      {cells(
        'ct-accent',
        [...stack(10, 3), ...stack(25, 2), ...stack(52, 2), ...stack(67, 1)],
        12,
        12,
      )}
      {cells('ct-loss', [...stack(94, 2), ...stack(109, 1)], 12, 12)}
    </>
  ),
  'line-chart': (
    <>
      <path className="ct-gain ct-third" d="M8 42l22-10 22 6 22-20v36H8z" />
      <path className="ct-stroke" d="M8 42l22-10 22 6 22-20" />
      <path className="ct-stroke ct-forecast ct-dashed" d="M74 18l36-10" />
    </>
  ),
  heatmap: (
    <>
      {HEAT.map((opacity, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid; the position is the identity
          key={i}
          className="ct-loss"
          x={8 + (i % 4) * 27}
          y={2 + Math.floor(i / 4) * 18}
          width="25"
          height="16"
          fillOpacity={opacity}
        />
      ))}
    </>
  ),
  'runway-chart': (
    <>
      <rect className="ct-plan" x="10" y="5" width="86" height="11" />
      <rect className="ct-accent" x="10" y="5" width="62" height="11" />
      <rect className="ct-loss" x="10" y="23" width="108" height="11" />
      <rect className="ct-accent" x="10" y="23" width="48" height="11" />
      <rect className="ct-plan" x="10" y="41" width="64" height="11" />
      <rect className="ct-accent" x="10" y="41" width="36" height="11" />
      <path className="ct-mark ct-dashed" d="M102 0v56" />
    </>
  ),
  'small-pieces': (
    <>
      <path className="ct-stroke" d="M10 14l14-6 14 4 14-9 14 5" />
      <rect className="ct-track" x="10" y="26" width="100" height="9" />
      <rect className="ct-gain" x="10" y="26" width="64" height="9" />
      <rect className="ct-accent" x="10" y="43" width="46" height="9" />
      <rect className="ct-gain ct-half" x="59" y="43" width="32" height="9" />
      <rect className="ct-loss" x="94" y="43" width="16" height="9" />
    </>
  ),
}

/** The drawing of one chart type. */
export function ChartThumb({ name }: { name: ThumbName }) {
  return (
    <svg className="chart-thumb" viewBox="0 0 120 56" aria-hidden="true" focusable="false">
      {THUMBS[name]}
    </svg>
  )
}
