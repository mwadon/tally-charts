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
  /** A column header of a chart's hidden data table. A header taken from a string accessor keeps the field name. */
  headerItem: string
  /** A data-table column header. */
  headerValue: string
  /** A data-table column header. */
  headerCategory: string
  /** A data-table column header. */
  headerDate: string
  /** A data-table column header. */
  headerPeriod: string
  /** A data-table column header. */
  headerGroup: string
  /** A data-table column header. */
  headerDetails: string
  /** A data-table column header. */
  headerColumn: string
  /** A data-table column header. */
  headerChange: string
  /** A data-table column header. */
  headerTotal: string
  /** A data-table column header. */
  headerPlan: string
  /** A data-table column header. */
  headerActual: string
  /** The ComparisonBars data-table column of plan minus actual. */
  headerDifference: string
  /** The data-table column of a LineChart band. */
  headerRange: string
  /** The row name of a Heatmap that has no label. */
  headerRow: string
  /** A RunwayChart data-table column header. */
  headerName: string
  /** A RunwayChart data-table column header. */
  headerDetail: string
  /** A RunwayChart data-table column header. */
  headerRunsOut: string
  /** A RunwayChart data-table column header. */
  headerResets: string
  /** A RunwayChart data-table column header. */
  headerProjectedAtReset: string
  /** A RunwayChart data-table column header. */
  headerStatus: string
  /** Default status of a RunwayChart row whose source is disconnected. */
  statusDisconnected: string
  /** Default status of a RunwayChart row without a forecast. */
  statusNoForecast: string
  /** Default status line of a RunwayChart row. Placeholder: `{date}`. */
  statusRunsOut: string
  /** Default status line when a RunwayChart row does not run out. Placeholder: `{percent}`. */
  statusAtReset: string
  /** Default status line of a RunwayChart row's reset. Placeholder: `{date}`. */
  statusResets: string
  /** RunwayChart legend. */
  legendProjectedUse: string
  /** RunwayChart legend, after the shades. Placeholder: `{shares}`, the level edges as percentages, such as "25, 50, 75, 100". */
  legendUnderShare: string
  /** RunwayChart legend. */
  legendRunsOut: string
  /** RunwayChart legend. */
  legendLocked: string
  /** RunwayChart legend. */
  legendReset: string
  /** RunwayChart legend. */
  legendNoForecast: string
  /** The change a ComparisonBars row shows when actual is within the tolerance. */
  onPlan: string
  /** A ComparisonBars row read aloud. Placeholders: `{label}`, `{plan}`, `{actual}`, `{delta}`. */
  planActual: string
  /** A WaterfallChart step read aloud. Placeholders: `{label}`, `{text}`, `{total}`. */
  runningTotal: string
  /** The first line of a WaffleColumns callout. */
  peak: string
  /** The default Heatmap legend label when there are no breaks. */
  binAll: string
  /** The lowest Heatmap legend bin. Placeholder: `{value}`. */
  binUnder: string
  /** A middle Heatmap legend bin. Placeholders: `{from}`, `{to}`. */
  binRange: string
  /** The highest Heatmap legend bin. Placeholder: `{value}`. */
  binOver: string
  /** A RangeMeter's value against its reference, read aloud. Placeholders: `{value}`, `{reference}`. */
  valueAgainst: string
  /** A ZoneMeter value above its maximum. Placeholder: `{max}`. */
  valueAbove: string
  /** A ZoneMeter value below its minimum. Placeholder: `{min}`. */
  valueBelow: string
  /** The label next to the reset tick of a RunwayChart row. */
  resetMark: string
  /** The accessible name of a scrolling Heatmap that has no title. */
  heatmapName: string
  /** Read before a Delta's value when it went up. */
  deltaUp: string
  /** Read before a Delta's value when it went down. */
  deltaDown: string
  /** Read before a Delta's value when it did not change. */
  deltaFlat: string
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
  headerItem: 'Item',
  headerValue: 'Value',
  headerCategory: 'Category',
  headerDate: 'Date',
  headerPeriod: 'Period',
  headerGroup: 'Group',
  headerDetails: 'Details',
  headerColumn: 'Column',
  headerChange: 'Change',
  headerTotal: 'Total',
  headerPlan: 'Plan',
  headerActual: 'Actual',
  headerDifference: 'Difference',
  headerRange: 'Range',
  headerRow: 'Row',
  headerName: 'Name',
  headerDetail: 'Detail',
  headerRunsOut: 'Runs out',
  headerResets: 'Resets',
  headerProjectedAtReset: 'Projected at reset',
  headerStatus: 'Status',
  statusDisconnected: 'Disconnected',
  statusNoForecast: 'No forecast',
  statusRunsOut: 'Runs out {date}',
  statusAtReset: '~{percent}% at reset',
  statusResets: 'Resets {date}',
  legendProjectedUse: 'Projected use',
  legendUnderShare: 'under {shares}%',
  legendRunsOut: 'Runs out',
  legendLocked: 'Locked until reset',
  legendReset: 'Reset',
  legendNoForecast: 'New window, no forecast',
  onPlan: 'On plan',
  planActual: '{label}, plan {plan}, actual {actual}, {delta}',
  runningTotal: '{label}, {text}, running total {total}',
  peak: 'Peak',
  binAll: 'All values',
  binUnder: 'Under {value}',
  binRange: '{from} to {to}',
  binOver: '{value} and up',
  valueAgainst: '{value} against {reference}',
  valueAbove: 'above {max}',
  valueBelow: 'below {min}',
  resetMark: 'reset',
  heatmapName: 'Heatmap',
  deltaUp: 'Up',
  deltaDown: 'Down',
  deltaFlat: 'No change',
}

/** Fills `{name}` placeholders from `values`; an unknown placeholder stays as text. */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  )
}
