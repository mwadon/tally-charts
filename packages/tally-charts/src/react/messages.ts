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
  /** The data-table column of a RankedBars `meta`. */
  headerRankedDetails: string
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
  /** The data-table column of a RunwayChart row's `sublabel`. */
  headerRunwayDetail: string
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
  waterfallStep: string
  /** What a screen reader calls an interactive chart (`aria-roledescription`). */
  chartRole: string
  /** The label of the running total in a WaterfallChart tooltip. */
  runningTotalLabel: string
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

// One `const` per default, read at the call site as `messages.noData ?? NO_DATA`, so a bundle holds
// only the strings its own components can show.
export const NO_DATA = 'No data'
export const NO_VALUE = 'no value'
export const KEYBOARD_HINT =
  'Use arrow keys to move between points, Home and End for first and last, Escape to clear.'
export const KEYBOARD_HINT_SELECT = 'Press Enter to select.'
export const POSITION = '{index} of {total}'
export const TARGET = 'target {value}'
export const TARGET_LABEL = 'Target {value}'
export const NOW = 'Now'
export const TOTAL = 'Total'
export const HEADER_ITEM = 'Item'
export const HEADER_VALUE = 'Value'
export const HEADER_CATEGORY = 'Category'
export const HEADER_DATE = 'Date'
export const HEADER_PERIOD = 'Period'
export const HEADER_GROUP = 'Group'
export const HEADER_RANKED_DETAILS = 'Details'
export const HEADER_COLUMN = 'Column'
export const HEADER_CHANGE = 'Change'
export const HEADER_TOTAL = 'Total'
export const HEADER_PLAN = 'Plan'
export const HEADER_ACTUAL = 'Actual'
export const HEADER_DIFFERENCE = 'Difference'
export const HEADER_RANGE = 'Range'
export const HEADER_ROW = 'Row'
export const HEADER_NAME = 'Name'
export const HEADER_RUNWAY_DETAIL = 'Detail'
export const HEADER_RUNS_OUT = 'Runs out'
export const HEADER_RESETS = 'Resets'
export const HEADER_PROJECTED_AT_RESET = 'Projected at reset'
export const HEADER_STATUS = 'Status'
export const STATUS_DISCONNECTED = 'Disconnected'
export const STATUS_NO_FORECAST = 'No forecast'
export const STATUS_RUNS_OUT = 'Runs out {date}'
export const STATUS_AT_RESET = '~{percent}% at reset'
export const STATUS_RESETS = 'Resets {date}'
export const LEGEND_PROJECTED_USE = 'Projected use'
export const LEGEND_UNDER_SHARE = 'under {shares}%'
export const LEGEND_RUNS_OUT = 'Runs out'
export const LEGEND_LOCKED = 'Locked until reset'
export const LEGEND_RESET = 'Reset'
export const LEGEND_NO_FORECAST = 'New window, no forecast'
export const ON_PLAN = 'On plan'
export const PLAN_ACTUAL = '{label}, plan {plan}, actual {actual}, {delta}'
export const WATERFALL_STEP = '{label}, {text}, running total {total}'
export const CHART_ROLE = 'chart'
export const RUNNING_TOTAL_LABEL = 'total'
export const PEAK = 'Peak'
export const BIN_ALL = 'All values'
export const BIN_UNDER = 'Under {value}'
export const BIN_RANGE = '{from} to {to}'
export const BIN_OVER = '{value} and up'
export const VALUE_AGAINST = '{value} against {reference}'
export const VALUE_ABOVE = 'above {max}'
export const VALUE_BELOW = 'below {min}'
export const RESET_MARK = 'reset'
export const HEATMAP_NAME = 'Heatmap'
export const DELTA_UP = 'Up'
export const DELTA_DOWN = 'Down'
export const DELTA_FLAT = 'No change'

/**
 * The English text of every key in `ChartMessages`. The wording isn't public and can change in any
 * release; override a key through `ChartsProvider messages`.
 */
export const DEFAULT_MESSAGES: Readonly<ChartMessages> = {
  noData: NO_DATA,
  noValue: NO_VALUE,
  keyboardHint: KEYBOARD_HINT,
  keyboardHintSelect: KEYBOARD_HINT_SELECT,
  position: POSITION,
  target: TARGET,
  targetLabel: TARGET_LABEL,
  now: NOW,
  total: TOTAL,
  headerItem: HEADER_ITEM,
  headerValue: HEADER_VALUE,
  headerCategory: HEADER_CATEGORY,
  headerDate: HEADER_DATE,
  headerPeriod: HEADER_PERIOD,
  headerGroup: HEADER_GROUP,
  headerRankedDetails: HEADER_RANKED_DETAILS,
  headerColumn: HEADER_COLUMN,
  headerChange: HEADER_CHANGE,
  headerTotal: HEADER_TOTAL,
  headerPlan: HEADER_PLAN,
  headerActual: HEADER_ACTUAL,
  headerDifference: HEADER_DIFFERENCE,
  headerRange: HEADER_RANGE,
  headerRow: HEADER_ROW,
  headerName: HEADER_NAME,
  headerRunwayDetail: HEADER_RUNWAY_DETAIL,
  headerRunsOut: HEADER_RUNS_OUT,
  headerResets: HEADER_RESETS,
  headerProjectedAtReset: HEADER_PROJECTED_AT_RESET,
  headerStatus: HEADER_STATUS,
  statusDisconnected: STATUS_DISCONNECTED,
  statusNoForecast: STATUS_NO_FORECAST,
  statusRunsOut: STATUS_RUNS_OUT,
  statusAtReset: STATUS_AT_RESET,
  statusResets: STATUS_RESETS,
  legendProjectedUse: LEGEND_PROJECTED_USE,
  legendUnderShare: LEGEND_UNDER_SHARE,
  legendRunsOut: LEGEND_RUNS_OUT,
  legendLocked: LEGEND_LOCKED,
  legendReset: LEGEND_RESET,
  legendNoForecast: LEGEND_NO_FORECAST,
  onPlan: ON_PLAN,
  planActual: PLAN_ACTUAL,
  waterfallStep: WATERFALL_STEP,
  chartRole: CHART_ROLE,
  runningTotalLabel: RUNNING_TOTAL_LABEL,
  peak: PEAK,
  binAll: BIN_ALL,
  binUnder: BIN_UNDER,
  binRange: BIN_RANGE,
  binOver: BIN_OVER,
  valueAgainst: VALUE_AGAINST,
  valueAbove: VALUE_ABOVE,
  valueBelow: VALUE_BELOW,
  resetMark: RESET_MARK,
  heatmapName: HEATMAP_NAME,
  deltaUp: DELTA_UP,
  deltaDown: DELTA_DOWN,
  deltaFlat: DELTA_FLAT,
}

/** Fills `{name}` placeholders from `values`; an unknown placeholder stays as text. */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  )
}
