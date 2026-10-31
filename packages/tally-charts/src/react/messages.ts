/**
 * The text the charts speak and show on their own. Strings may hold `{placeholders}`; a key left
 * out of `ChartsProvider messages` keeps its English default.
 */
export interface ChartMessages {
  /** An empty chart, bar or meter. Also the cell text for a missing heatmap value. */
  noData: string
  /** A table cell with nothing in it, read by screen readers next to the dash. */
  noValue: string
  /** Read when a chart takes keyboard focus. An empty string removes the hint. */
  keyboardHint: string
  /** Appended to `keyboardHint`, after one space, when the point can be selected. */
  keyboardHintSelect: string
  /** The live-region position of a point. Placeholders: `{index}`, `{total}`. */
  position: string
  /** A target in a spoken value, such as "40, target 50". Placeholder: `{value}`. */
  target: string
  /** The default text under a Meter's target tick. Placeholder: `{value}`. */
  targetLabel: string
  /** The Now line of a RunwayChart. */
  now: string
  /** The total column and row of a Heatmap, and the end row of a WaterfallChart. */
  total: string
}

export const DEFAULT_MESSAGES: ChartMessages = {
  noData: 'No data',
  noValue: 'no value',
  keyboardHint:
    'Use arrow keys to move between points, Home and End for first and last, Escape to clear.',
  keyboardHintSelect: 'Press Enter to select.',
  position: '{index} of {total}',
  target: 'target {value}',
  targetLabel: 'Target {value}',
  now: 'Now',
  total: 'Total',
}

/** Fills `{name}` placeholders from `values`; an unknown placeholder stays as text. */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  )
}
