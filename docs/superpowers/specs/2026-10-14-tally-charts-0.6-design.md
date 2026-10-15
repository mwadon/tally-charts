# tally-charts 0.6 — time scale, API freeze, accessibility

Date: 2026-10-14. Status: approved in brainstorming, pending written review.

Parent spec: `2026-10-14-tally-charts-design.md` (the "main spec"). This document amends it for 0.6; where they disagree, this one wins.

Appendices, which hold the evidence and proposed fixes this spec refers to by ID:
- `2026-10-14-tally-charts-0.6-api-audit.md` (API-1 … API-23)
- `2026-10-14-tally-charts-0.6-a11y-audit.md` (A11Y-1 … A11Y-18), with its scripts in `assets/0.6-a11y-audit/`

## 1. Purpose and release sequence

The main spec's single "1.0" row is split in two:

| Version | Contents |
|---|---|
| 0.6 | Time scale; API review and freeze (all breaking changes land here); accessibility audit fixes; the 0.4/0.5 backlog |
| 1.0 | Docs site, npm publish (changesets release workflow), making the repo public. No breaking changes. |

0.6 ships as one spec and **two plans, executed in order**, each on its own branch, with its own whole-branch review and merge:

- **0.6a — API and time scale** (§2, §3, §4)
- **0.6b — accessibility, palette, reflow** (§5, §6, §7)

0.6b starts from main after 0.6a is merged, so it builds on the frozen names.

### Success criteria

- `LineChart` and the line-family marks render a time x axis with sensible ticks for spans from hours to decades, in UTC by default.
- The public surface (root, `tally-charts/core`, `theme.css`) matches §3, and a committed API report fails CI on any unreviewed change.
- No `d3-*` type appears in the published `.d.ts`.
- axe (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, `best-practice`) reports zero violations on every story in both themes.
- Every text colour meets 4.5:1 and every meaningful mark meets 3:1 against its surface, in both themes, checked by unit tests on tokens plus an e2e check on rendered SVG text.
- At 320 CSS px no story scrolls the page horizontally and no labels overlap.
- Bundle budgets hold: `core` ≤ 8 KB, each chart ≤ 15 KB, LineChart (with time) ≤ 13 KB (raised from 12 KB after 0.6a measured 12.02 KB; leaves room for 0.6b a11y code), small UI pieces ≤ 4 KB.

### Out of scope (later)

- Docs site, npm publish, public repo → 1.0.
- API-12 (`aspectRatio` on fixed-height charts), API-13 (unified callout shapes), API-14 (`style` on UI pieces), API-17 (`TargetSpec`, base `Series<D>`) → 1.x, as additive changes.
- Time scales on bar charts (they stay `band`).
- Driving a real screen reader in CI. The manual VoiceOver pass is a checklist step for the maintainer (§7).

## 2. Time scale (0.6a)

### Declaration

```ts
type TimeScaleSpec = {
  type: 'time'
  domain?: readonly [TimeInput, TimeInput]
  nice?: boolean          // default true: round the domain out to tick interval boundaries
  zone?: 'utc' | 'local'  // default 'utc'
}
type TimeInput = Date | number | string // Date, epoch ms, or an ISO 8601 string
```

`ScaleSpec` gains this variant. `<Chart x={{ type: 'time' }}>` and `<LineChart x={{ type: 'time' }}>` accept it. The y axis stays linear.

### Values

- The `x` accessor may return `Date`, epoch ms or an ISO string. A shared `toTime(v): number | undefined` normalises them: `Date` → `getTime()`, finite number → itself, string → `Date.parse` (so a date-only ISO string is UTC midnight, matching the default zone). Anything else, or `NaN`, is `undefined`.
- Points with an undefined x are skipped with one dev warning per chart, the same way invalid numbers already are (main spec §7). No throws.
- The domain is inferred as [min, max] of valid x values. A single distinct value is padded by one day on each side. With no valid values the domain is [now − 1 day, now], plus the dev warning.
- A point's id is the ISO string of its x (`new Date(ms).toISOString()`), prefixed by the series id as today (`"series:iso"`).

### Implementation (`packages/tally-charts/src/core/time.ts`)

- Position: our existing `linearScale` over epoch ms. No `d3-scale` time scale (it pulls in `d3-time-format` and `d3-interpolate`).
- Ticks: `d3-time` intervals. The `'utc'` zone uses `utcMillisecond … utcYear`, and `'local'` uses `timeMillisecond … timeYear`. The interval is picked like d3's `tickInterval`: the ladder 1s, 5s, 15s, 30s, 1min, 5min, 15min, 30min, 1h, 3h, 6h, 12h, 1d, 2d, 1w, 1mo, 3mo, 1y, then year multiples from `d3-array` `tickStep`, with the closest step to `span / count` (`count` defaults to the axis tick count, 5).
- `nice` floors and ceils the domain to the chosen interval.
- The public interface, also used by custom marks:

```ts
interface TimeScale {
  (value: number): number      // epoch ms → px
  invert(px: number): number   // px → epoch ms
  domain(): [number, number]
  range(): [number, number]
  ticks(count?: number): number[]
  zone: 'utc' | 'local'
}
```

- New runtime dependency: `d3-time` (^3) and `@types/d3-time` as a devDependency. The main spec §3.1's dependency line becomes: `d3-scale` (band/point only), `d3-array`, `d3-time`, and `d3-shape` only. No `d3-time` type leaks into `.d.ts` (§3, API-1).

### Formatting dates

- `DateFormatSpec = 'auto' | 'day' | 'month' | 'quarter' | 'year' | Intl.DateTimeFormatOptions`.
- Formatting uses `Intl.DateTimeFormat` with the `ChartsProvider` locale. The time zone is `'UTC'` for the `'utc'` zone, and unset for `'local'`.
- `'auto'` (the default for a time axis) is multi-scale. Each tick shows the coarsest field that changed at that boundary: the year on a year boundary, the month name on a month boundary, the day otherwise, and the time when the interval is under a day. The first tick always carries enough context, e.g. "Jan 2026".
- `'quarter'` renders "Q1 2026". Intl has no quarter field, so it is built from the month.
- Tooltip headers, announcements and data-table x cells format with the same formatter as the axis.

### Where it works

- `LineChart`, and the marks `Line`, `Band`, `Area`, `Region`, `Target`, `NearestPointer`, `Grid` and `Axis` on `<Chart>`.
- `Region` `from`/`to` accept `TimeInput`.
- `LineChart`'s shaded forecast region and its "one tooltip for all series at an x" work on time as they do on point scales. "Same x" means equal epoch ms.
- Marks that need a band (`Bars`, `ColumnHighlight`) emit one dev warning on a time scale and render nothing.

## 3. API changes (0.6a)

All proposals marked "must-before-freeze" in the API audit land, as written there, with the refinements below. The audit has the current/proposed/migration detail for each.

| ID | Change | Breaking |
|---|---|---|
| API-1 | `ResolvedScale` is `{ kind: 'linear'; scale: LinearScale } \| { kind: 'band'; scale: BandScale } \| { kind: 'point'; scale: PointScale } \| { kind: 'time'; scale: TimeScale }`, all our own interfaces. No d3 types in `.d.ts` | yes |
| API-2 | `tally-charts/core` exports only: formatting (`createFormatter`, `createFormatters`, `fmt`, `DEFAULT_LOCALE`, `DEFAULT_CURRENCY` and their types), thresholds (`thresholds`, its types, and the heatmap level helper from §4), shared types (`Tone`, `TONES`, `Fill`, `Id`, `Accessor`, `PerItem`, `SeqLevel`), `toNumber`, `toTime`, the scale spec types and the resolved scale interfaces. Everything else is internal | yes |
| API-3 | A public `ChartContextValue` with only the stable fields listed in the audit. `useChart()` takes no argument. `useRegisterPoints(points)` reads the context itself. The root re-exports the scale interfaces | yes |
| API-4 | `Bars.tooltip` → `Bars.segments`. The chart-level `tooltip` is typed `boolean \| ((point: ChartPoint<D>) => ReactNode)`, and the function form is implemented in 0.6 | yes |
| API-5 | LineChart: `axis` → `yAxis`, `axisFormat` → `yAxisFormat`, plus a new `xAxisFormat`. Single-axis charts keep `axis`/`axisFormat` ("the chart's only axis"); BarChart and DotHistogram gain `axisFormat` | yes |
| API-6 | `AxisValue = string \| number \| Date`; `AxisFormat = FormatSpec \| DateFormatSpec \| ((value: AxisValue) => string)`. `Axis` adapts number-only formatters internally | yes |
| API-7 | Unexport `ComparisonStatus`, `WaterfallKind` and `DeltaDirection`. Rename `LineRange` → `LineBand` | yes |
| API-8 | ComparisonBars: `overIsBad` → `good?: 'up' \| 'down'` (default `'down'`), `onPlanText` → `onPlanLabel` | yes |
| API-9 | CSS surface: `data-ch-part` on every HTML sub-part; theme.css user-facing selectors move to them; classes are declared private; private variables renamed `--_ch-*`; the token table is published (main spec tokens + `--ch-tooltip-shadow`, `--ch-hatch-tint`, `--ch-tone-text-mix`, `--ch-seq-base`, `--ch-seq-mix-1…5`, `--ch-heatmap-cell-height`, `--ch-heatmap-min-cell`); `--ch-seq-1…5` documented as computed, read-only outputs; `data-ch-dir` → `data-ch-direction` | yes |
| API-10 | `ChartPoint<D = unknown>`. `onSelect`/`onActiveChange`/`tooltip` on Chart and every high-level chart are typed with `D`. Waterfall/Bridge use a union including named start/total row types | no |
| API-11 | Every array input is `readonly T[]`; `Thresholds.bins` is readonly | no |
| API-15 | `FormatSpec` gains `{ preset: FormatPreset; digits?: number; signed?: boolean }`, resolved with the provider locale. Axis defaults use whole numbers where all ticks are whole, so "0.0%" becomes "0%" | no |
| API-16 | Heatmap gains `chartId`. The missing-title dev warning covers `<Chart>` (so every high-level chart) and Heatmap | no |

API-18 … API-23 change no code. Each gets one documentation line in the README (and later the docs site).

### Freeze guard

- `@microsoft/api-extractor` (pinned exact) produces `packages/tally-charts/api/tally-charts.api.md` and `api/core.api.md` from the built `.d.ts`. Both files are committed.
- `pnpm --filter tally-charts api:check` fails when the generated report differs from the committed one. It runs in the CI `check` job. `api:update` regenerates it. A PR that changes the public API therefore shows the change in a reviewable `.api.md` diff.
- A unit test lists the public CSS custom properties and `data-ch-part` values and fails when theme.css or a component adds an unlisted one.

### Migration notes

The README gets a "Changes in 0.6" section listing every breaking rename above, with a before/after line each. The `foundation-0-6` changeset names them too.

## 4. Backlog folded into 0.6a

- Export `heatmapLevel(value, breaks)` (core) returning the level index 0…5 the Heatmap uses, so a standalone `Legend` stays in sync with custom `breaks`.
- `pointTicks` anchors its first and last labels (`text-anchor` start/end) when padding is 0. It merges with `bandTicks` into one `categoryTicks`.
- One shared category-scale guard for `Line` and `Band`.
- Grid tests assert tick positions, not only counts.

## 5. Accessibility (0.6b)

### Keyboard model and announcements (A11Y-1, 10, 12, 16)

- `<figure>` stays the labelled, described container.
- Focus, `onKeyDown` and `onBlur` move to an inner element: `<div role="application" aria-roledescription="chart" aria-labelledby={titleId} aria-describedby="{descId} {hintId}">` wrapping the SVG and HTML overlay.
- A visually hidden hint is read with it: "Use arrow keys to move between points, Home and End for first and last, Escape to clear.", plus " Press Enter to select." when `onSelect` is set. A new optional `keyboardHint?: string` overrides it (additive, for localisation).
- The `DataTable` stays outside the application element, so browse mode can read it.
- Only charts that register points get the application element and a tab stop. A `<Chart>` with no points is not focusable.
- Focus alone activates the first point and shows its tooltip (main spec §5).
- Announcements include the series and position: "{series}, {n} of {total}, {x label}, {value}". When only one series exists, the series is omitted. `ariaLabel` overrides still win.
- Escape also dismisses a hover-opened tooltip (WCAG 1.4.13).

### Tone contrast (A11Y-2, 3)

- Any text painted in a tone (SVG row and value labels, Bridge notes, Waffle labels, tooltip pill values) uses the ink mix `.ch-tone-text` already uses. The rule is one shared CSS rule keyed on `data-ch-tone-text`, not per-component colours.
- Light theme mark tokens are darkened to ≥ 3:1 on `--ch-surface`:
  - `--ch-warn` #be802f
  - `--ch-gain` #22a363
  - `--ch-neutral` #8e8e95
- `--ch-accent-soft` keeps its soft fill (it means "estimate") and gains a 1 px outline at ≥ 3:1 (`color-mix` of the tone with ink). Hatched marks get the same outline.
- Dark theme values already pass and are unchanged except where §6 changes the heatmap ramp.

### Forced colors (A11Y-4, 5, 6)

`theme.css` gets a `@media (forced-colors: active)` block:
- Swatches, Meter, InlineBar, RangeMeter dot, DotCount dots and heatmap levels keep visible shapes. They get `forced-color-adjust: none` with system colours: `CanvasText` for marks, `Highlight` for active/accent, `GrayText` for neutral and soft, and borders so adjacent levels differ.
- SVG text and strokes use `CanvasText`. Fills use system colours by tone role.
- Focus indicators use a real `outline` (transparent outside forced colors, where the box-shadow ring stays), so they survive forced colors.
- The heatmap top-cell glow (§6) is disabled.

### Heatmap semantics and navigation (A11Y-7, 15)

- Column headers contain only the column name.
- Column totals move into their own `role="row"`, which starts with a `rowheader` labelled by `totalLabel` (default "Total") and is still shown at the top.
- The corner cell is labelled by a new optional `rowLabel?: string` (default: the row accessor key when it is a string, else "Row").
- Grid navigation reaches total cells. Ctrl+Home/Ctrl+End go to the first and last cell. PageUp/PageDown move 5 rows.

### Data table and legends (A11Y-11, 17)

- Data table headers come from axis and series labels, not raw field names. Row headers are the x/category cells, and empty values render "—" with an accessible "no value".
- `dataTable` on high-level charts also accepts `{ caption?: string; columns?: Partial<Record<string, string>> }`, an additive widening.
- LineChart's legend shows each series' line style and dot style (solid/hollow), so "Current path" and "With your changes" differ by more than colour.

### Documented as decorative (A11Y-13, 14)

Grid lines, tracks, hatch gaps, fade ends, dimmed inactive marks and bands carry no information that isn't also available as text or in the data table. They are listed in `docs/a11y.md` and keep their current contrast.

## 6. Palette and visual fidelity (0.6b)

- **Heatmap ramp (A11Y-9 + backlog):**
  - The `loss` sequential ramp moves from the current muted crimson to the hot pink of reference `05-leakage-heatmap.png`. The exact base is picked by sampling the reference, then adjusted only as far as the contrast rules below require.
  - Dark themes: `--ch-seq-5` is the pure base, and `--ch-seq-ink-strong` is `var(--ch-surface)`.
  - Light themes: levels 1–2 cells and swatches get a 1 px inset outline (`color-mix` of the base 45 % with the surface).
  - The top-value cell gets a soft glow (`box-shadow` in the base colour), off in forced colors and under `prefers-reduced-transparency` if supported.
- **Contrast rules, enforced by unit tests on computed tokens, 6 tones × 2 themes × 5 levels:**
  - cell text ≥ 4.5:1 on its level;
  - adjacent levels differ by ≥ 1.3:1;
  - level 5 is ≥ 3:1 against the surface.
  - A standalone `Legend` gets the same guarantees for every tone. The README's "only loss and accent" caveat goes.
- **Other backlog fidelity items:**
  - the ring on the pinned #5819 dot (DotHistogram);
  - spacing between the waffle peak pill and its column;
  - the "Likely range" legend swatch uses the band fill;
  - column header name and total visually separated (falls out of §5).
- All visual baselines are regenerated once, at the end of 0.6b: darwin locally, linux through the docker route in `ci.yml`.

## 7. Reflow, tests and docs (0.6b)

### Reflow at 320 CSS px (A11Y-8)

- **Heatmap:**
  - Columns are `minmax(var(--ch-heatmap-min-cell, 56px), 1fr)`.
  - The grid sits in a scroll container with `overflow-x: auto`. When it actually overflows (checked by a `ResizeObserver`), it gets `tabindex="0"`, `role="group"` and an `aria-label`.
  - Horizontal scrolling is allowed for this 2-D layout; overlap is not.
- **ComparisonBars:**
  - New `layout?: 'auto' | 'columns' | 'stacked'`, default `'auto'`.
  - `'auto'` switches to `'stacked'` when `innerWidth - labelWidth - valueWidth < 120`. In `'stacked'`, the label and values sit on one row above the bars, which span the full width.
- **RowLabels** (Waterfall, Ranked, Bridge): left and right labels get a `maxWidth` from the margin columns and truncate with an ellipsis via `core/text`. The full text goes in `<title>` and in the data table.
- **Callout:** the pill is clamped to the chart width and may wrap to two lines. It never widens the page.
- The `last-12-weeks--selectable` story uses a responsive width.
- The "Margin outlook" reference story (`07-forecast.png`) moves to a real time x axis (`x={{ type: 'time', field }}`) with the week dates read from the reference, keeping its look. It is the realistic test of the 0.6a time scale; its baselines are regenerated with the rest.

### Tests and CI gates

- **Unit:**
  - `toTime`;
  - the time tick ladder: every rung, crossing a year, DST days in `'local'` (run with `TZ=Europe/Warsaw`), sub-day spans, a single-value domain, an empty domain;
  - `'auto'` date formatting;
  - `FormatSpec` objects;
  - token contrast (§5, §6);
  - the API report (§3);
  - the CSS surface list.
- **e2e** (`apps/storybook/e2e`):
  - The existing axe test widens to `wcag22aa` and `best-practice`, both themes. Zero violations is the gate.
  - A rendered SVG text contrast check, since axe reports SVG text as "incomplete". It ports `rendered-contrast.mjs` from the audit assets.
  - A reflow test at 320 px: no page horizontal scroll and no overlapping label boxes.
  - A forced-colors test (`emulateMedia({ forcedColors: 'active' })`): marks and focus indicators stay visible.
  - Keyboard tests updated for the application element.
- **New stories:** LineChart over a day span (hourly), a quarter (daily), and five years (monthly), each in both themes, with baselines.
- `@axe-core/playwright` stays pinned at 4.13.0.

### Documentation

- `docs/a11y.md`:
  - the keyboard model;
  - the screen-reader output per chart type;
  - the decorative-elements list;
  - known limits (forced colors verified only in Chromium emulation);
  - a manual checklist, including a VoiceOver script with the steps and the expected speech for LineChart, RankedBars and Heatmap, which the maintainer runs before 1.0.
- README:
  - the token table;
  - "classes are private; `data-ch-part`, `data-ch-*` state attributes and `--ch-*` tokens are API";
  - "Changes in 0.6";
  - one line each for API-18 … API-23.
- The changeset `foundation-0-6` lists the breaking changes.

## 8. Errors and edge cases specific to 0.6

- Mixed x types in one series (dates and numbers): each value goes through `toTime`, which accepts both forms, so this works. An x value that `toTime` rejects is skipped with the warning.
- Time domain spans under 1 ms: treated as a single value (padded ±1 day).
- `zone: 'local'` on the server vs the client can differ. The docs say to prefer `'utc'` for SSR, and the stories use `'utc'`.
- `keyboardHint=""` disables the hint, with no warning.
- `layout="columns"` on a narrow ComparisonBars is honoured as given (the user opted out of stacking).
