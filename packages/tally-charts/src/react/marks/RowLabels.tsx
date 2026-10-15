import { resolveAccessor, resolvePerItem, toFieldGetter } from '../../core/accessor'
import { truncateLabel } from '../../core/text'
import type { Accessor, PerItem, Tone } from '../../core/types'
import { DEV } from '../../core/warn'
import { useChartContext } from '../context'
import { toneVar } from '../ui/util'

export interface RowLabelsProps<D> {
  /** Defaults to <Chart data>. */
  data?: readonly D[]
  /** Row field matching the band scale on <Chart y>. Defaults to its field. */
  y?: Accessor<D, string | number>
  /** The main line. */
  text: Accessor<D, string>
  /** An optional second, muted line. */
  subtext?: Accessor<D, string>
  /** Which side of the plot the column sits on. Default 'left'. */
  side?: 'left' | 'right'
  /** Text alignment. Default 'start' on the left side and 'end' on the right. */
  align?: 'start' | 'end'
  /**
   * Moves the text inward, in px: from the chart's outer edge when the text aligns to it, and
   * from the plot edge otherwise. Default 0.
   */
  inset?: number
  /** 'middle' centres the text in its row; 'above' puts it at the top of the row. Default 'middle'. */
  position?: 'middle' | 'above'
  /** Longest text in px; longer text is cut with an ellipsis, and the full text goes in a `<title>`. */
  maxWidth?: number
  /** Text color role per row. Default: ink. */
  tone?: PerItem<D, Tone | undefined>
  /** Smaller, muted text for secondary columns such as "9 jobs". Default false. */
  muted?: boolean
}

/** Half the distance between the two lines of a two-line label, in px. */
const LINE_GAP = 9

export function RowLabels<D>(props: RowLabelsProps<D>) {
  const ctx = useChartContext('RowLabels')
  const { side = 'left', position = 'middle', inset = 0, maxWidth, muted = false } = props
  const align = props.align ?? (side === 'left' ? 'start' : 'end')
  if (ctx.y.kind !== 'band') {
    if (DEV) ctx.warn('row-labels-scale', 'RowLabels need a band scale on <Chart y>.')
    return null
  }
  const band = ctx.y.scale
  const getRow = toFieldGetter(props.y) ?? ctx.y.field
  if (!getRow) {
    if (DEV) {
      ctx.warn(
        'row-labels-field',
        'RowLabels need a row field: pass `y` or set `field` on <Chart y>.',
      )
    }
    return null
  }
  const data = (props.data ?? ctx.data) as readonly D[]
  const getText = resolveAccessor(props.text)
  const getSub = props.subtext ? resolveAccessor(props.subtext) : undefined
  const toneOf =
    props.tone === undefined ? undefined : resolvePerItem<D, Tone | undefined>(props.tone)
  const outerRight = ctx.innerWidth + ctx.margin.right
  const x =
    side === 'left'
      ? align === 'start'
        ? -ctx.margin.left + inset
        : -inset
      : align === 'end'
        ? outerRight - inset
        : ctx.innerWidth + inset
  const cut = (value: unknown) => {
    const text = value === null || value === undefined ? '' : String(value)
    return maxWidth === undefined ? text : truncateLabel(text, maxWidth)
  }
  const size = band.bandwidth()

  return (
    <g data-ch-part="row-labels" data-ch-side={side}>
      {data.map((d, i) => {
        const start = band(String(getRow(d, i)))
        if (start === undefined) return null
        const fullText = String(getText(d, i) ?? '')
        const fullSub = getSub ? String(getSub(d, i) ?? '') : ''
        const text = cut(fullText)
        const sub = getSub ? cut(fullSub) : ''
        if (!text && !sub) return null
        const tone = toneOf?.(d, i, data)
        const mid = start + size / 2
        const above = position === 'above'
        const mainY = above ? start : sub ? mid - LINE_GAP : mid
        const subY = above ? start + 2 * LINE_GAP + 2 : mid + LINE_GAP
        const baseline = above ? 'hanging' : 'middle'
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: one label group per data row, in order
          <g key={i}>
            {text !== fullText || sub !== fullSub ? (
              <title>{[fullText, fullSub].filter(Boolean).join(', ')}</title>
            ) : null}
            {text ? (
              <text
                data-ch-part="row-label"
                data-ch-tone={tone}
                data-ch-tone-text={tone ? 'true' : undefined}
                data-ch-muted={muted ? 'true' : undefined}
                x={x}
                y={mainY}
                textAnchor={align}
                dominantBaseline={baseline}
                style={tone ? toneVar(tone) : undefined}
              >
                {text}
              </text>
            ) : null}
            {sub ? (
              <text
                data-ch-part="row-sublabel"
                x={x}
                y={subY}
                textAnchor={align}
                dominantBaseline={baseline}
              >
                {sub}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}

export interface RowDividersProps {
  /** Distance in px from both outer edges. Default 0. */
  inset?: number
}

/** Thin rules between rows, across the whole chart width. */
export function RowDividers({ inset = 0 }: RowDividersProps) {
  const ctx = useChartContext('RowDividers')
  if (ctx.y.kind !== 'band') {
    if (DEV) ctx.warn('row-dividers-scale', 'RowDividers need a band scale on <Chart y>.')
    return null
  }
  const band = ctx.y.scale
  const domain = band.domain()
  const size = band.bandwidth()
  const x1 = -ctx.margin.left + inset
  const x2 = ctx.innerWidth + ctx.margin.right - inset
  const lines: { key: string; y: number }[] = []
  for (let i = 1; i < domain.length; i++) {
    const prev = band(domain[i - 1] as string)
    const next = band(domain[i] as string)
    if (prev === undefined || next === undefined) continue
    lines.push({ key: domain[i] as string, y: (prev + size + next) / 2 })
  }
  return (
    <g data-ch-part="row-dividers">
      {lines.map((line) => (
        <line key={line.key} data-ch-part="row-divider" x1={x1} x2={x2} y1={line.y} y2={line.y} />
      ))}
    </g>
  )
}
