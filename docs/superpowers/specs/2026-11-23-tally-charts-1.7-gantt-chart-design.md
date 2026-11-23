# tally-charts 1.7 — GanttChart

Date: 2026-11-23. Status: approved by the owner (2026-11-23). What the owner decided is listed in §10;
everything marked "author's call" is a default the owner has not seen in detail.

Design: the artboards "GanttChart · light" and "GanttChart · dark" of the canvas
"Gantt chart i Treemap — tally-charts" (https://claude.ai/artifact/3Hi411NiJXXYiQymLCRme8; files
`project/Main.dc.html` and `project/GanttDark.dc.html`). Where this document and the artboard
differ (§3 Fills, §3 Week ticks), this document wins.
Parent specs: `2026-10-14-tally-charts-design.md`, the 0.6–1.0 specs and the 1.1–1.6 chart specs.
Everything they require of a high-level chart (themes, a11y, reflow, forced colors, dev warnings,
size budgets, API report, i18n through `ChartMessages`) applies here unless this document says
otherwise.

## 1. Purpose

Show a schedule against its plan: which tasks are done, which one is running, what is still
ahead, and where the schedule slipped from the baseline. The reader should see at a glance where
"today" is, which tasks took longer than planned, and how late the milestones are.

`GanttChart` is a high-level chart in `src/react/charts/`. Release: **1.7.0** (minor; additive
only).

Goals: the artboard as a component; a plain schedule (start and end only) that works with three
props; a schedule against a baseline that needs no computation on the caller's side.

Anti-goals: a project-management tool (editing, dragging, dependencies), a colour per task or per
group, red for every task that merely started late, a chart that scrolls horizontally.

## 2. API

```tsx
<GanttChart
  title="Kitchen remodel"
  data={tasks}                // one row per task or milestone
  x="name"
  start="start"
  end="end"                   // a row without an end is a milestone
  group="phase"
  baselineStart="plannedStart"
  baselineEnd="plannedEnd"
  now="2026-03-27"
/>
```

```ts
type GanttChartProps<D> = ChartName &
  Omit<ChartPassThroughProps<D>, 'aspectRatio' | 'height' | 'margin'> & {
    /** One row per task or milestone, drawn in data order. */
    data: readonly D[]
    /** Task name. */
    x: Accessor<D, string>
    /** When the task starts, or the date of a milestone. */
    start: Accessor<D, TimeInput>
    /** When the task ends. A row without an end, or with an end equal to its start, is a milestone. */
    end?: Accessor<D, TimeInput | null | undefined>
    /** Row id. Default: the data index. */
    id?: Accessor<D, Id>
    /** Group name. Rows of one group are drawn together under a heading. */
    group?: Accessor<D, string | null | undefined>
    /** Planned start. With `baselineEnd`, draws the baseline under the bar. */
    baselineStart?: Accessor<D, TimeInput | null | undefined>
    /** Planned end. */
    baselineEnd?: Accessor<D, TimeInput | null | undefined>
    /** Share of the task that is done, from 0 to 1. Default: derived from `now`. */
    progress?: Accessor<D, number | null | undefined>
    /** The "today" line, and what splits done from planned. Never read from the clock. */
    now?: TimeInput
    /** The time axis. Default: from the data, rounded out to tick boundaries. */
    domain?: readonly [TimeInput, TimeInput]
    /** Default 'utc', which renders the same on the server and the client. */
    zone?: TimeZone
    /** Default 'accent'. The tone of the bars; an overrun is always 'loss'. */
    tone?: Tone
    /** Where task names go. Default 'auto': left of the bars, above them in a narrow chart. */
    labelPosition?: 'auto' | 'left' | 'top'
    /** The text after each bar (duration, percent, overrun; a milestone's date). Default true. */
    valueLabels?: boolean
    /** The key above the plot. Default true. */
    legend?: boolean
    dataTable?: boolean | DataTableOptions
    tooltip?: ChartTooltip<D>
  }
```

Author's calls in the API:

- A flat list with accessors, as every chart in the library; no nested `children`.
- `x` names the row, as in `FunnelChart` and `DonutChart`.
- A milestone is a row without an end. There is no `type` field.
- `now` is a prop and is optional. The chart never calls `Date.now()`, so a server render and its
  hydration agree (`RunwayChart` has the same rule).
- `start` and `end` are instants and the bar runs exactly from one to the other. A date-only
  string is UTC midnight (`toTime`), so a task that ends "on March 6" in the caller's data and
  should cover that day needs `end` on March 7. The docs page says so.
- `zone` has the name and the default of `TimeScaleSpec`.

Not in the API: dependencies, per-row tone or colour, a status field, row height, a `height`
prop, sorting, collapsing groups, week start, working-day calendars, custom label content.

## 3. Rendering

Everything is drawn in the chart's SVG, as in `FunnelChart` and `DonutChart`. A pure module
(`gantt-geometry.ts`) turns rows, the domain and a width into rows, bars, baselines, milestones
and labels; the component draws them.

### Rows

- A row is valid when `start` is a valid time (`toTime`). A valid `end` after `start` makes it a
  task; a missing end (`null`, `undefined`) or an end equal to `start` makes it a milestone.
- Skipped with a development warning: an invalid `start`, an `end` that is present but invalid,
  an `end` before `start`.
- Order: data order. With `group`, groups appear in the order of their first row and each
  group's rows keep their data order; rows without a group come first, without a heading.
- A group heading is a row of its own: the group name at weight 600 in the label column and a
  hairline (`--ch-grid`) across the plot. It is not a point.
- Row height: 32 px with names on the left, 52 px with names on top (20 px for the name, then
  the 32 px bar row). A heading is 32 px in both.

### Time axis

- The existing time scale (`core/time.ts`). The inferred domain covers every valid start, end
  and baseline date and is rounded out to tick boundaries; `now` does not widen it. An explicit
  `domain` is used as given and bars are clipped at its edges; a row wholly outside it keeps its
  name and has no bar.
- Tick labels are above the plot, left-aligned to their tick with a 6 px offset as on the
  artboard, formatted with the library's automatic date labels (`autoTickLabels`) in the
  `ChartsProvider` locale. One vertical grid line per tick, from the first row to the last.
- About one tick per 100 px of plot width, at least 2. Ticks whose labels would overlap are
  thinned with the library's existing thinning. A tick whose label would run past the chart's
  right edge keeps its grid line and loses its label (the last tick sits on the plot's edge).
- Label texts are what `autoTickLabels` gives, so the first tick carries the year
  ("Mar 1, 2026"); the artboard's bare "Mar 2" is not reproduced.
- Week ticks: the scale's week ticks fall on Sundays. The artboard shows Mondays; a week-start
  option is out of scope (author's call).

### Bars

- A task bar is 14 px high, 7 px from the top of its bar row, with the library's bar radius
  (`--ch-radius`), from `start` to `end`. A bar is never narrower than 2 px.
- Done share of a task:
  - with a `progress` value: that value, clamped to 0–1 (a value outside it warns);
  - else with `now`: 1 when `end ≤ now`, 0 when `start ≥ now`, otherwise
    `(now − start) / (end − start)`;
  - else 1.
- Fills: the done share, from the bar's start, is solid in `tone`; the rest is the library's
  hatch fill in `tone`. So a finished task is solid, a planned one is hatched and a running one
  is solid up to its done share and hatched after it. This differs from the artboard, which
  draws the rest of a running task in a lighter solid: solid for actual and hatch for planned is
  the library's existing grammar, it needs no new token, and the lighter solid was too close to
  the accent in the dark theme (author's call).
- Overrun: when a task has a valid baseline and lasts longer than it
  (`end − start > baselineEnd − baselineStart`), the last
  `(end − start) − (baselineEnd − baselineStart)` of the bar is drawn in `loss`, solid or
  hatched as that part of the bar would be. A task that only started late has no overrun.
- Bars carry `data-ch-part="gantt-bar"`; the parts inside it are separate filled shapes, so
  forced colors and hit testing work as for bars.

### Baseline

- A valid baseline is a `baselineStart` and a `baselineEnd` that are valid times with the end
  after the start. For a milestone only `baselineStart` is read.
- Task: a 3 px line in `--ch-neutral` under the bar (17 px below the bar's top), from
  `baselineStart` to `baselineEnd`, radius 2 px.
- Milestone: a hollow 8 px diamond with a 1.5 px `--ch-neutral` outline at `baselineStart`, on
  the row's centre line, under the milestone's own diamond.
- An accessor that is given but yields an invalid or half-missing baseline for a row: no
  baseline for that row, with a development warning. A row with both baseline values missing is
  simply a row without a baseline.

### Milestones

- A 12 px diamond (a square turned 45°) centred on `start` and on the row's centre line, with a
  2 px `--ch-ink` outline. It is filled with `--ch-ink` when reached and with the surface colour
  when not. Reached: `progress` of 1, else `start ≤ now` when `now` is given, else reached.

### Value labels

After each bar, 8 px right of its end (14 px after a milestone's centre), 12 px text:

- task: the duration in whole days ("5d"; under one day "<1d"), in muted ink. A running task
  (done share above 0 and below 1) shows its done share as a whole percent instead ("50%").
- an overrun adds "+2d" (whole days, at least 1) at weight 600 in the loss text colour: `loss`
  mixed with ink through `--ch-tone-text-mix`, as coloured text elsewhere in the library.
- milestone: its date (the library's `'day'` format without the year when the whole domain is in
  one year), in muted ink, then the slip against the baseline when it is at least one whole day:
  "+3d" in the loss text colour when late, "−2d" in muted ink when early.
- Day counts are written by `Intl.NumberFormat` with `style: 'unit'`, `unit: 'day'` in the
  `ChartsProvider` locale: `unitDisplay: 'narrow'` here ("5d"), `'long'` in the tooltip, the
  announcement and the table ("5 days", "1 day"). The locale's own plural rules apply, so
  `ChartMessages` needs no plural forms (author's call; the library has no plural handling).
- Gutter: the plot ends before the chart's right edge by the width of the widest value label
  (by the library's width estimate) plus 8 px, at most 96 px and at most 25% of the chart width,
  as the artboard's 64 px gutter does with its data. Without value labels there is no gutter.
- With the gutter a label normally fits after its bar. A label that would still cross the
  chart's right edge (a capped gutter, a bar clipped by an explicit `domain`) is drawn left of
  the bar's start instead, right-aligned, unless it would overlap that row's baseline marker or
  cross the plot's left edge; then it is not drawn.
- `valueLabels={false}` draws none of them.

### Now line

- With a valid `now` inside the domain: a 1 px vertical line in `--ch-ink` over all rows, and
  under the plot the text "Today · Mar 27" (12 px, weight 600; "Today" from `ChartMessages`),
  centred on the line and kept inside the plot. The line is drawn over the grid and under the
  bars. A `now` outside the domain draws nothing; an invalid `now` warns.

### Names

- `labelPosition="left"`: a label column left of the plot. Its width is the widest name or group
  name by the library's width estimate plus 12 px, at least 96 px, at most 220 px and at most
  40% of the chart width. Names that do not fit are cut with `truncateLabel` and keep the full
  text in a `<title>`.
- `labelPosition="top"`: the plot takes the full width and each name is drawn above its bar row,
  left-aligned to the chart, cut to the chart width.
- `'auto'`: `'left'` when the chart is at least 480 px wide, otherwise `'top'`.

### Key

- A row of key items above the tick labels, drawn in the SVG (author's call: the chart knows
  which kinds occur; `DonutChart` draws its list the same way): "Done" (solid), "Planned"
  (hatch), "Overrun" (loss), "Baseline" (the 3 px neutral line), "Milestone" (the filled
  diamond). An item is shown only when the data contains that kind. The key is drawn when at
  least two items would be shown and `legend` is not false.
- Items wrap to further lines by the library's width estimate; the plot moves down by the key's
  height.

### Size

- The chart's height follows its content (key, tick labels, rows, the now label); there is no
  `height` prop.
- The server render and the first client render use `initialWidth`, so they agree; the chart may
  switch `labelPosition` after it is measured.

### Empty state

No valid rows: the empty state, as other charts.

### Active row

With `dimInactive` (default as in bar charts) the other bars, baselines and diamonds are dimmed;
the active row's name is drawn at weight 600. Text is never dimmed.

## 4. Interaction and accessibility

- Every valid row (task or milestone) is one point, in drawn order; headings are not. Arrow
  Down / Right go to the next row, Up / Left to the previous one, Home / End to the ends.
- Pointer: the row under the pointer, across the whole row (name and plot).
- Default tooltip, as segments of the library's tooltip pill. Task: the name, "Mar 14 – Mar 21",
  the duration ("7 days"), then when they apply the done share ("50% done"), the overrun
  ("2 days over baseline") and the baseline dates ("baseline Mar 13 – Mar 18"). Milestone: the
  name, the date, and "3 days late" or "2 days early" against the baseline.
- Announcement: the position, the name and the same facts, e.g. "7 of 13, Plumbing rough-in,
  Mar 14 – Mar 21, 7 days, done, 2 days over baseline". A task says "done", "in progress, 50%"
  or "planned"; a milestone says "milestone" and "reached" or "upcoming".
- Data table: one row per data row in data order (skipped rows included, with empty cells):
  name, group (when `group` is given), start, end, baseline start and baseline end (when the
  baseline accessors are given), progress (the done share as a percent), status.
- The plot, the names and the key are hidden from assistive technology as in every chart; the
  data table and the announcements carry the values.
- Colour is not the only carrier: done and planned differ by fill, an overrun has its "+Nd"
  label, and the tooltip, the announcement and the table say all of it in words.
- Forced colors: bar parts use the system colour of their tone as bars do, the hatch stays a
  pattern, diamonds and the now line are `CanvasText`, the active row is `Highlight`.
- Reflow: at 320 CSS px names are above the bars and nothing scrolls horizontally.

`ChartMessages` gains what the texts above need and nothing else. Expected: `today`, the status
words (`done`, `inProgress`, `planned`, `milestone`, `reached`, `upcoming`), the key label
`overrun` and `baseline`, the phrases around a day count, each with a `{duration}` placeholder
filled with the `Intl` text of §3 ("{duration} over baseline", "{duration} late",
"{duration} early"), "{value} done", and the table headers that do not exist yet (start, end, baseline start,
baseline end, progress, status). The builder may adjust names to the file's conventions and
reuse existing keys with the same text (`headerName`, `headerGroup`).

## 5. Dev warnings

- An invalid `start`, an invalid `end`, an end before the start (`gantt-date`); the row is
  skipped.
- A baseline that is invalid or half missing for a row (`gantt-baseline`); the row has no
  baseline.
- A `progress` outside 0–1 or not a number (`gantt-progress`); it is clamped, or ignored when
  not a number.
- An invalid `now` or `domain` (`gantt-now`, `gantt-domain`); it is ignored.
- Repeated ids, as every chart with `id`.

## 6. Tests and gates

- Unit, geometry on a fixed size: bar positions from dates, the 2 px minimum, clipping at an
  explicit domain, the inferred domain (baselines included, `now` not), done share from
  `progress`, from `now` and without either, the solid / hatch split, the overrun length and its
  fill, tasks that only start late, baselines for tasks and milestones, milestone state, row
  order with and without groups (ungrouped first), row heights in both label positions, label
  column width limits and truncation, value label texts ("<1d", percent, "+Nd", "−Nd"), label
  flipping and hiding, the gutter and its caps, the unlabelled last tick, day counts in a second
locale (`pl-PL`), the now line inside and outside the domain, key items by kind and
  wrapping.
- Unit, component: skipped rows with warnings, points, tooltip, announcement, keyboard, hover on
  the name, active state, callbacks, data table, `labelPosition` switch at 480 px and the forced
  positions, `legend={false}`, `valueLabels={false}`, `zone`, SSR and hydration (server render
  before the `console.error` spy; a wide server render hydrated into a narrow container), a
  60 px wide chart, a single row, a single milestone.
- Storybook stories (`light` and `dark`: the artboard's data; `plain`: start and end only,
  themeless defaults; `progress`: progress values without `now`; `months`: a year-long schedule
  with month ticks; `narrow`: names on top) with e2e gates: screenshots darwin + linux, axe,
  contrast, reflow at 320 CSS px, forced colors, keyboard.
- New size-limit entry `GanttChart` ≤ 15 KB gzip; `check:treeshake` fixture; other entries stay
  within their limits. If the entry does not fit, the builder reports the measured size and what
  drives it instead of raising the limit.
- `api:update`: the report gains `GanttChart`, `GanttChartProps` and the new `ChartMessages`
  keys, nothing else.
- Changeset: `minor`.

## 7. Docs

- Page `gantt-chart` (fixture, `navigation.json`, `PropsTable`), examples under
  `examples/gantt-chart/`: schedule against a baseline (the artboard), plain schedule (start and
  end only), progress values without `now`, a year-long schedule with month ticks. The page
  explains that `end` is an instant (§2).
- A `chart-index` tile with a new thumb and an entry in `home.json`; the heading becomes
  "Eighteen charts, one grammar" (refreshes the home baselines on both platforms).
- Cards switch `labelPosition` between 375 and 1280 px, so their heights differ: the block
  heights and `NARROW_CHART_HEIGHTS` entries follow the rules in `CLAUDE.md`.
- `CLAUDE.md` and `PROGRESS.md` updated as for the previous charts.
- Sample data is fictional and in English.

## 8. Approaches

1. **A dedicated SVG chart with its own geometry module** (chosen). The path of `FunnelChart`
   and `DonutChart`: a pure module computes the layout, the component draws it inside `<Chart>`
   and inherits the time scale, date ticks, hatch patterns, tooltip, keyboard, data table and
   SSR. Cost: names in SVG are cut by estimated width.
2. Composition from the existing marks (`Bars`, `RowLabels`, `Axis`, `Grid`). Least new code at
   first, but `Bars` draws one value per category; ranges, the done share, baselines, headings
   and diamonds would have to go into shared marks and would grow every bar chart
   (`StackedBarChart` is already at its limit).
3. HTML and CSS grid, as `RunwayChart`. Names would wrap naturally, but the time axis, the grid,
   the hatch and pointer handling would be written a second time outside `<Chart>`.

The owner picked 1: a Gantt is mostly geometry on a time axis, and that path has been walked
twice with all its gates.

## 9. Out of scope

Dependency arrows, dragging and editing, collapsing groups, horizontal scrolling and zoom,
working-day calendars and weekend shading, a week-start option, hour-level labels (the chart
draws any instants, but durations are written in days), several bars in one row, per-task tones,
resource rows, a critical path.

## 10. Decisions

Owner (2026-11-23):

1. **Scope:** the whole artboard in the first version: tasks, groups, milestones, the today line,
   progress, the baseline and the red overrun. No dependency arrows.
2. **How it is built:** a dedicated SVG chart with its own geometry module (§8, approach 1).
3. **The outline of the API and behaviour** as played back in the conversation: a flat list with
   `x`, `start`, `end`, `group`, `baselineStart`, `baselineEnd`, `progress` and `now`; a row
   without an end is a milestone; the bar state follows `now`, or `progress` when a row has it;
   `now` is optional and never read from the clock; red only for days beyond the baseline's
   length; the label after the bar; a key that shows only the kinds present; automatic height;
   names above the bars in a narrow chart.

Author's calls (not yet confirmed by the owner): the hatched rest of a running task instead of
the artboard's lighter solid; `end` as an exact instant; Sunday week ticks; an overrun on planned
and running tasks too, hatched; the key drawn in the SVG and only from two kinds up; "Done" and
"Planned" as the key's words; ungrouped rows first; the 480 px switch and the label column
limits; the right gutter sized to the widest value label; day counts through `Intl` unit
formatting instead of plural message keys; tick labels with the year on the first tick; label
flipping and hiding; the early milestone in muted ink; `zone`, `tone`,
`labelPosition`, `valueLabels`, `legend` and `domain` as props; the tooltip and announcement
texts; the message keys; the warning names; version 1.7.0 with this chart alone.
