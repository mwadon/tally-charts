# tally-charts public API audit (pre-freeze, after 0.5)

Scope: `src/index.ts` (root), `src/core/index.ts` (`tally-charts/core`), `theme.css` (custom properties, data attributes, classes). Paths below are relative to `packages/tally-charts/`.

Already decided for 0.6, so not proposed again here: the time scale, the heatmap bin→level helper, `pointTicks` anchorEnds at padding 0, the Heatmap `title` warning, and deduping the Line/Band guard and pointTicks/bandTicks. Several items below depend on the time scale and say so.

**Breaking changes are cheap right now.** `package.json` is still `0.0.0` and the package has never been published to npm. A "breaking" change here only means updating stories, the README and the spec. So the must-before-freeze list is about getting the frozen surface right, even where that means a rename. It also means the `isDev` alias "kept for the 0.1 public API" (`src/core/warn.ts:13`) protects no real users.

Summary: 9 must-before-freeze, 8 nice, 6 leave (23 proposals).

---

## Must-before-freeze

### API-1 · Types · Published `.d.ts` imports `d3-scale` types that consumers don't get
- **Current:** `ResolvedScale` (`src/core/scale.ts:37-40`) exposes `ScaleBand<string>` / `ScalePoint<string>` from `d3-scale`. The emitted `dist/ticks-*.d.ts:1` has `import { ScaleBand, ScalePoint } from "d3-scale"`. `@types/d3-scale` is only a devDependency (`package.json:46`), and `d3-scale` ships no types. The public `bandTicks` / `pointTicks` / `computeBars` signatures do the same.
- **Proposed:** Define our own minimal interfaces in core, the same way `LinearScale` already does (`src/core/linear.ts:4`):
  - `BandScale`: `(v: string) => number | undefined`, `domain()`, `range()`, `bandwidth()`, `step()`.
  - `PointScale`: the same, with `bandwidth() === 0`.
  - Make `ResolvedScale` use only these. The time scale (0.6) should add a `kind: 'time'` arm with the same kind of interface.
- **Breaking:** Yes, but only for code that calls d3 methods outside the new interface on `ctx.x.scale`.
- **Rationale:** Today a consumer with `skipLibCheck` gets `any` for every `ctx.x.scale`. Without it, they get an unresolved-module error. Either way the 1.0 types would be tied to d3's typings forever. This also lets the time scale ship without leaking d3-time types.
- **Migration:** None for normal use. Custom marks that call d3-only methods (`.copy()`, `.align()`) need to build their own d3 scale.

### API-2 · Placement · `tally-charts/core` exports internals that would freeze the layout code
- **Current:** `src/core/index.ts:1-59` exports about 60 symbols, including:
  - accessor plumbing: `resolveAccessor`, `resolveIds`, `resolvePerItem`, `toFieldGetter`, `FieldGetter`
  - dev plumbing: `createWarner`, `isDev`, `Warn`
  - text measuring: `CHAR_WIDTH` (7) and `truncateLabel`, while `ticks.ts:108` keeps a different private `CHAR_WIDTH` (6.5)
  - tooltip placement: `placeTooltip`, `Placement*`
  - tick helpers: `thinTicks`, `estimateWidth`, `MeasureTick`, and `bandTicks` / `pointTicks`, which are about to be deduped
  - layout inputs that take internal plumbing: `computeBars` needs `getX: FieldGetter` and `warn: Warn`; `createScale(spec, data, axis, length, warn)`
  - `binDots`, `stackStrip`, `medianOf`, `packWaffle`, `runningTotals`, `linePath`, `bandPath`, `areaPath`, `clampToRange`, `categoryCenter`, `categoryStep`
- **Proposed:** For 1.0, ship a deliberate core:
  - Formatting: `createFormatter`, `createFormatters`, `fmt`, `DEFAULT_LOCALE`, `DEFAULT_CURRENCY`, `FormatPreset`, `FormatSpec`, `Formatter`, `Formatters`, `FormatOptions`, `LocaleOptions`.
  - Thresholds: `thresholds`, `Thresholds`, `ThresholdBin`, `ThresholdLegendItem`, plus the decided heatmap level helper.
  - Shared types: `Tone`, `TONES`, `Fill`, `Id`, `Accessor`, `PerItem`, `SeqLevel`, `toNumber`.
  - Scale spec types: `ScaleSpec` and its variants, plus `ResolvedScale`, `LinearScale`, `BandScale` and `PointScale` from API-1.
  - Optionally `linearScale`, `niceDomain`, `inferLinearDomain`: they are small and stable.
  - Everything else becomes internal. If users ask, re-add helpers later as an additive `tally-charts/layout` entry.
- **Breaking:** Yes.
- **Rationale:** Every exported function signature is frozen under semver. These signatures carry internal plumbing (`warn`, `FieldGetter`, `valueField`), and two of them are already scheduled for refactor (the tick dedupe), so freezing them now blocks changes we have already planned. The spec's success criteria only need the formatters and `thresholds` to be public and server-safe.
- **Migration:** Nothing in the stories or README imports these. Drop them from the README if they are mentioned.

### API-3 · Placement / Types · The custom-mark API (`useChart`, `ChartContextValue`, `useRegisterPoints`) exposes the store
- **Current:**
  - `ChartContextValue` (`src/react/context.ts:15-42`) exposes `warn: Warn`, `registerPoints`, `unregisterPoints`, `radius`, `chartId`, `setActive(id, source)` and `data: readonly unknown[]`.
  - `useChart(component = 'useChart')` (`context.ts:46`) has a parameter that only exists for the error message.
  - `useRegisterPoints(registry, points)` (`src/react/useRegisterPoints.ts:7`) makes the user pass the context back in.
  - The root doesn't export `ResolvedScale` / `LinearScale` / `Warn` / `FormatOptions`, though `ChartContextValue` references them, so a custom mark has to import from both entries to narrow `ctx.x.kind`.
  - `chartId` is public, but the pattern ids it scopes are not: `paintFor` and `patternId` aren't exported. So a custom mark can't use hatch fills anyway.
- **Proposed:**
  - Split the internal context type from a public `ChartContextValue` with the stable fields: `width`, `height`, `innerWidth`, `innerHeight`, `margin`, `data`, `x`, `y`, `format`, `dimInactive`, `activeId`, `activePoint`, `points`, `setActive`, `select`, `selectable`, `overlay`.
  - Change to `useChart()` with no argument.
  - Change to `useRegisterPoints(points)`, reading the context itself.
  - Re-export `ResolvedScale`, `LinearScale`, `BandScale` and `PointScale` from the root.
  - Keep `warn`, `registerPoints`, `unregisterPoints`, `radius` and `chartId` internal. Add a `usePaint(tone, fill)` later (additive) if custom hatch is wanted.
- **Breaking:** Yes. It touches the `useRegisterPoints` signature and removes context fields.
- **Rationale:** This is the extension contract the spec promises ("custom blocks reading the same scales"). Whatever ends up in it is frozen, including store internals that the 0.6 time scale and any interaction refactor will want to change.
- **Migration:** `useRegisterPoints(ctx, pts)` becomes `useRegisterPoints(pts)`. No story uses the removed fields.

### API-4 · Naming · `tooltip` means three different things
- **Current:**
  - `BarsProps.tooltip?: (d, i) => TooltipSegment[]` (`src/react/marks/Bars.tsx:28`).
  - Every high-level chart has `tooltip?: boolean` (for example `BarChart.tsx:49`, `LineChart.tsx:87`).
  - `<Tooltip content>` takes `(point) => ReactNode` (`overlays/Tooltip.tsx:10`).
  - The same per-item segments are called `segments` on `DotHistogramProps.segments` (`DotHistogram.tsx:34`), `DotItem.segments`, `ChartPoint.segments` and `CalloutProps.segments`.
- **Proposed:**
  - Rename `Bars.tooltip` to `segments`.
  - Reserve the chart-level `tooltip` for `boolean | ((point: ChartPoint) => ReactNode)`. The function form can come later as an additive change, and it closes the spec gap that high-level charts can't customise tooltip content without `tooltip={false}` plus a child `<Tooltip>`.
- **Breaking:** Yes, for Bars only.
- **Rationale:** One name for one concept. Otherwise a user moving from `<BarChart tooltip>` to `<Bars tooltip>` meets a different type under the same name.
- **Migration:** `<Bars tooltip={fn}>` becomes `<Bars segments={fn}>`. The internal callers are ComparisonBars, RankedBars, WaterfallChart and BridgeChart.

### API-5 · Naming · LineChart axis props are asymmetric and can't format the x axis
- **Current:** `LineChartProps.axis` / `axisFormat` cover the value (y) axis, and `xAxis` covers the category axis (`LineChart.tsx:75-79`). There's no x-axis format.
  - On the single-axis charts, `axis` means "the chart's one axis": the category axis on `BarChart.tsx:39`, the value axis on WaterfallChart, StripPlot and DotHistogram.
  - DotHistogram and BarChart have no `axisFormat`. WaterfallChart and StripPlot do.
- **Proposed:**
  - LineChart: rename `axis` → `yAxis` and `axisFormat` → `yAxisFormat`, keep `xAxis`, and add `xAxisFormat`. The time-scale x axis needs that anyway.
  - Keep `axis` / `axisFormat` on the single-axis charts, and document the rule: "`axis` is the chart's only axis".
  - Add `axisFormat` to DotHistogram and BarChart (additive).
- **Breaking:** Yes, for LineChart only. It is 0.5, unpublished.
- **Rationale:** Once 0.6 puts dates on LineChart x, `axis` vs `xAxis` plus a missing `xAxisFormat` becomes the most visible wart. Renaming before 1.0 costs nothing.
- **Migration:** On `<LineChart>`, `axis` becomes `yAxis` and `axisFormat` becomes `yAxisFormat`.

### API-6 · Types · `AxisFormat` is a second format type and can't take dates
- **Current:** `AxisFormat = FormatPreset | ((value: string | number) => string)` (`src/react/marks/Axis.tsx:13`) sits alongside `FormatSpec = FormatPreset | ((value: number) => string)` (`src/core/format.ts:2`). The charts adapt between them by hand (`WaterfallChart.tsx:270-272`, `StripPlot.tsx:240-242`, `LineChart.tsx:249-251`, `DotHistogram.tsx:249`). A time axis (0.6) will produce `Date` or epoch-ms tick values.
- **Proposed:** In 0.6, together with the time scale, settle on one exported `AxisValue = string | number | Date` and `AxisFormat = FormatSpec | DateFormatSpec | ((value: AxisValue) => string)`.
  - `DateFormatSpec` is a preset name or `Intl.DateTimeFormatOptions`.
  - `Axis` converts number-only `FormatSpec` functions internally, so the charts stop wrapping `format(Number(v))`.
- **Breaking:** Yes, for user callbacks annotated `(v: string | number) => string`. Unannotated arrows keep compiling.
- **Rationale:** Under `strictFunctionTypes`, widening a callback's parameter union after 1.0 is breaking. It has to happen in the release that adds dates.
- **Migration:** Change the annotation to `(v: AxisValue) => string`, or drop it.

### API-7 · Types · Exported types that no public prop references, plus a type/prop name mismatch
- **Current:**
  - `ComparisonStatus` (`ComparisonBars.tsx:17`, exported at `src/index.ts:18`) is only used by the internal `ComparisonRow`.
  - `WaterfallKind` (`WaterfallChart.tsx:40`, exported at `index.ts:41`) is only used by the internal `WaterfallRow`.
  - `DeltaDirection` (`ui/Delta.tsx:6`, exported at `index.ts:83`) only types an internal map and a data attribute.
  - `LineRange` (`LineChart.tsx:45`) is the type of the prop named `band`.
- **Proposed:** Remove `ComparisonStatus`, `WaterfallKind` and `DeltaDirection` from the exports. Keep `DeltaDirection` only if it gets documented as the set of values for `data-ch-direction`. Rename `LineRange` → `LineBand`.
- **Breaking:** Yes, type-only.
- **Rationale:** Exported types become frozen promises. These describe internal rows, and the internal row shape will change, for example `WaterfallRow` when steps gain features.
- **Migration:** Replace imports with string literals, or with `LineBand`.

### API-8 · Naming · ComparisonBars polarity and text props don't match the rest
- **Current:** `overIsBad?: boolean` (`ComparisonBars.tsx:40`) expresses the same idea as `Delta`'s `good?: 'up' | 'down'` (`ui/Delta.tsx:14`). `onPlanText` (`ComparisonBars.tsx:38`) uses a `*Text` suffix, while the other UI-text props use `*Label` (`totalLabel`, `targetLabel`, `minLabel`, `binLabels`, `stepLabel`, `tooltipLabel`).
- **Proposed:** Change to `good?: 'up' | 'down'`, where 'up' means actual over plan and the default is `'down'`. Rename `onPlanText` → `onPlanLabel`.
- **Breaking:** Yes.
- **Rationale:** Polarity will spread (Stat, Meter and InlineBar are natural next users). One spelling before the freeze avoids a third variant.
- **Migration:** `overIsBad={false}` becomes `good="up"`, and `onPlanText` becomes `onPlanLabel`. Update the README line that mentions `overIsBad={false}`.

### API-9 · CSS · The public CSS surface is undeclared and mixes private plumbing with tokens
- **Current:**
  - The spec says "every element has `data-ch-part` …; class names are not API" (spec §6). But the HTML pieces style their sub-parts only through classes, so classes are de-facto API:
    - pill: `.ch-pill-seg`, `.ch-pill-value`, `.ch-pill-label`
    - legend: `.ch-legend-item`, `.ch-swatch`, `.ch-legend-label`, `.ch-legend-count`
    - meter and range meter: `.ch-meter-track`, `.ch-meter-fill`, `.ch-range-*`
    - stat: `.ch-stat-label`, `.ch-stat-value`
    - heatmap: `.ch-heatmap-header`, `.ch-heatmap-rowheader`, `.ch-heatmap-total`
    - `theme.css:82-84` even keys the sequential ramp on `.ch-legend` / `.ch-heatmap`.
  - Private plumbing variables share the `--ch-` namespace with the tokens: `--ch-swatch-color` (`ui/util.ts:16`), `--ch-range-ref-color` (`RangeMeter.tsx:65`), `--ch-heatmap-columns` (`Heatmap.tsx:335`), `--ch-seq-ink-strong`.
  - Tokens that are real but not in the spec's token table: `--ch-tooltip-shadow`, `--ch-hatch-tint`, `--ch-tone-text-mix`, `--ch-seq-base`, `--ch-seq-mix-1…5`, `--ch-heatmap-cell-height` (`theme.css:835`).
  - `--ch-seq-1…5`, listed as tokens in the spec, are recomputed on `[data-ch-root], .ch-legend, .ch-heatmap` (`theme.css:82-107`), so overriding them on `:root` does nothing.
  - The same concept has two attributes: `data-ch-dir` on bars and `data-ch-direction` on Delta.
- **Proposed:**
  1. Add `data-ch-part` to every HTML sub-part listed above (additive). Move the theme.css selectors that users would override onto them, and state in the README that classes are private.
  2. Rename the private variables to `--_ch-*`: `--_ch-swatch-color`, `--_ch-range-ref`, `--_ch-heatmap-columns`, `--_ch-seq-ink-strong`.
  3. Publish the token table: the spec's table plus the six tokens above.
  4. Document `--ch-seq-1…5` as computed, read-only outputs. Users steer them with `--ch-seq-base` and `--ch-seq-mix-N`.
  5. Rename `data-ch-dir` → `data-ch-direction`.
- **Breaking:** Yes, for anyone styling through classes or private variables. Nobody outside the repo does yet.
- **Rationale:** CSS has no type checker. After 1.0, every selector and variable that works counts as API unless it was declared private up front.
- **Migration:** Use `[data-ch-part="…"]` selectors. `[data-ch-dir]` becomes `[data-ch-direction]`.

---

## Nice (additive or low-risk; do in 0.6 where convenient)

### API-10 · Types · Callback points carry `datum: unknown`
- **Current:** `ChartPoint.datum: unknown` (`src/react/types.ts:24`), so `onSelect` users must cast, for example `apps/storybook/stories/LastTwelveWeeks.stories.tsx:57` (`point.datum as Week`). `ChartPassThroughProps<D>` (`charts/shared.ts:8`) carries a `D` that nothing uses, and half the charts pass `unknown`. Heatmap already does this right with `HeatmapCell<D>`.
- **Proposed:** `ChartPoint<D = unknown>`. Chart and the high-level charts type `onSelect` / `onActiveChange` with `ChartPoint<D>`. Waterfall and Bridge use `ChartPoint<S | WaterfallStart | WaterfallTotal>`, which also gives the synthetic end row a named type. `Tooltip content` stays `ChartPoint`.
- **Breaking:** No. Contravariant callbacks typed with `ChartPoint` still accept it, and existing casts still compile.
- **Rationale:** This is the biggest everyday DX win, and the spec promises "typed generic accessors".
- **Migration:** None. Casts can be removed.

### API-11 · Types · Accept readonly arrays everywhere
- **Current:** These are mutable arrays:
  - `LegendProps.items: LegendItem[]` (`ui/Legend.tsx:20`)
  - `TooltipPillProps.segments` (`ui/TooltipPill.tsx:5`)
  - `CalloutProps.segments` (`overlays/Callout.tsx:14`)
  - `BridgeChartProps.callout` (`BridgeChart.tsx:48`)
  - `DotItem.segments`, `ChartPoint.segments`
  - `Thresholds.bins`, and the return of `legend()`

  The other props already use `readonly` (`data`, `series`, `breaks`).
- **Proposed:** Make inputs `readonly T[]`. `Thresholds.bins` becomes `readonly ThresholdBin[]`.
- **Breaking:** No for inputs. Negligible for outputs (only code that mutates them).
- **Rationale:** Consistency, and `as const` data works without copying.
- **Migration:** None.

### API-12 · Defaults · `aspectRatio` is dropped for no reason on fixed-height charts
- **Current:** LineChart, DotHistogram, WaffleColumns and BridgeChart `Omit<…, 'aspectRatio'>` (for example `LineChart.tsx:54`), yet they use fixed default heights: 280, 220, 200 and 360. Only the row-sized charts (Ranked, Comparison, Waterfall, Strip) have a real reason to omit it.
- **Proposed:** Keep `aspectRatio` on those four. Default stays `height ?? (aspectRatio ? undefined : N)`.
- **Breaking:** No.
- **Rationale:** Responsive dashboards. This also makes the pass-through rule simple: "row-sized charts omit `aspectRatio`".
- **Migration:** None.

### API-13 · Naming · The three charts with a pinned callout each use a different prop shape
- **Current:**
  - `BridgeChart.callout?: TooltipSegment[]` (`BridgeChart.tsx:48`), default off.
  - `WaffleColumns.callout?: boolean | ((d) => TooltipSegment[])` (`WaffleColumns.tsx:39`), default on.
  - `DotHistogram.calloutId?: Id` (`DotHistogram.tsx:43`).
  - `Callout.content: ReactNode` versus `Tooltip.content: (point) => ReactNode`: same name, different type.
- **Proposed:**
  - Widen Bridge to `boolean | readonly TooltipSegment[] | ((d: S) => TooltipSegment[])`, matching Waffle. Keep the different defaults, which are design-driven.
  - Keep `calloutId`, since DotHistogram needs a target.
  - Widen `Callout.content` to `ReactNode | ((point) => ReactNode)`.
- **Breaking:** No.
- **Migration:** None.

### API-14 · Naming · UI pieces lack `style`
- **Current:** Stat, Delta, Meter, RangeMeter, InlineBar, DotCount, Legend and TooltipPill take `className` only (for example `ui/Stat.tsx:22`). The spec lists `className` and `style` as the styling hooks.
- **Proposed:** Add `style?: CSSProperties`, merged after the internal tone variables.
- **Breaking:** No.
- **Migration:** None.

### API-15 · Types · `FormatSpec` has no options form
- **Current:** `FormatSpec = FormatPreset | ((v: number) => string)` (`core/format.ts:2`). 'percent' always shows one decimal (backlog item: axis labels read "0.0%"). The only escape is a function, which loses `ChartsProvider` locale and currency.
- **Proposed:** Add an object form `{ preset: FormatPreset; digits?: number; signed?: boolean }`, resolved by `createFormatter` with the provider locale. Ship it with API-6 so `AxisFormat` composes from it.
- **Breaking:** No.
- **Migration:** None.

### API-16 · Accessibility · Heatmap has no `chartId`, and only Heatmap will warn about a missing title
- **Current:** Heatmap builds aria ids from `useId()` (`Heatmap.tsx:161`), so they can collide across React roots, which is exactly the case `chartId` exists for on Chart (`Chart.tsx:55`). The decided warning covers Heatmap only, but `<Chart>` and every high-level chart also render an unnamed `role=figure` when `title` is missing.
- **Proposed:** Add `chartId` to Heatmap. Extend the decided dev warning to `<Chart>`, which covers every high-level chart.
- **Breaking:** No.
- **Migration:** None.

### API-17 · Naming · Shared shapes are written inline instead of named
- **Current:** `target?: number | { value: number; label?: string }` is repeated inline in `BarChart.tsx:31`, `DotHistogram.tsx:41` and `LineChart.tsx:66`. `LineSeries` and `StripSeries` repeat `{ id, label, value, tone }`.
- **Proposed:** Export `TargetSpec` and a base `Series<D>`. `LineSeries` extends `Series<D>` and adds `style` and `tooltipLabel`.
- **Breaking:** No.
- **Rationale:** Wrapper components can type their props without copying literals.
- **Migration:** None.

---

## Leave (inconsistencies noted; not worth churn, just document)

### API-18 · Naming · BarChart `x` / `y` name data roles, not screen axes
- **Current:** `BarChart.tsx:19-22`: in `orientation="horizontal"`, `x` (the category) is drawn on the vertical axis. `<Chart x/y>` names screen axes.
- **Proposed:** Keep the names and document "x = category, y = value in both orientations" (already in the JSDoc). Renaming to `category` / `value` would ripple into WaffleColumns.
- **Breaking:** No.

### API-19 · Naming · `at` means three different things
- **Current:** In `ValueLabel.at`, a number is a data index (`marks/ValueLabel.tsx:10`). `ColumnHighlight.at` is a category (`ColumnHighlight.tsx:6`). `ConnectorLink.at` is a value.
- **Proposed:** Leave it. Each is scoped by its mark. Document that the `ValueLabel` number form is an index.
- **Breaking:** No.

### API-20 · Naming · `radius` is a corner radius on Bars and ColumnHighlight, a dot radius elsewhere
- **Current:** `Bars.tsx:22` and `ColumnHighlight.tsx:10` use it for corners. `Dots`, `Line`, `StripPlot` and `LineChart` use it for dots.
- **Proposed:** Leave it. Each mark has exactly one geometry the word can mean.
- **Breaking:** No.

### API-21 · Naming · `showValues` / `showScale` vs bare booleans
- **Current:** `ComparisonBars.showValues` and `RangeMeter.showScale` use a `show*` prefix. The other toggles are bare: `legend`, `totals`, `grid`, `median`, `area`, `connectors`, `dividers`, `track`, `peak`, `tooltip`, `dataTable`.
- **Proposed:** Leave it. The bare forms `values` and `scale` would be ambiguous.
- **Breaking:** No.

### API-22 · Defaults · Per-chart defaults differ
- **Current:**
  - Heights: Chart 240, Line 280, DotHistogram 220, Waffle 200, Bridge 360.
  - Band padding: 0.2 on the scale, 0.35 Bar, 0.45 Bridge, 0.3 Waffle.
  - Tick counts: 5, and 6 on DotHistogram.
  - Default tones: `InlineBar`, `RangeMeter` and `DotCount` use 'loss', while `Meter` uses 'accent'.
- **Proposed:** Leave them. Each follows its reference screenshot. List the defaults in the docs site.
- **Breaking:** No.

### API-23 · Naming · `meta` means a number on WaterfallStep and a string accessor on RankedBars
- **Current:** `WaterfallStep.meta?: number` (`WaterfallChart.tsx:33`) vs `RankedBars.meta: Accessor<D, string>`. The Bridge equivalent is `note: string`. `meta` on Waterfall is also redundant: `S extends WaterfallStep` already lets users add any field.
- **Proposed:** Leave it (it appears in the spec's example). Optionally document "extend `S`" as the preferred route.
- **Breaking:** No.

---

## Keep as-is, deliberately

- **Interaction.** `activeId` / `onActiveChange(id, point | null)` / `onSelect(id, point)` work the same on Chart, every high-level chart and Heatmap. `undefined` means uncontrolled and `null` means controlled-and-cleared. Heatmap passes a typed `HeatmapCell<D>` instead of a `ChartPoint`, which is fine (and API-10 brings the charts up to that level).
- **RankedBars selection.** `selectedId` / `selectedTone` stay separate from `activeId`: selection is persistent, hover is transient. It stays controlled-only.
- **Formatting.** `format: FormatSpec` everywhere, default 'number'. `valueFormat` and `axisFormat` default to `format`. `fmt` and `createFormatter` exist on both entries; `useFormat()` respects `ChartsProvider`.
- **`toneBy` + `thresholds()`.** Used by DotHistogram and the Legend counts, per the spec. `tone: PerItem` stays on the bar charts.
- **Accessors.** `Accessor<D, V> = (keyof D & string) | fn` checks only that the key exists, not the value type. That is deliberate: numeric strings and nullable fields are valid input (`toNumber`). Document it rather than tighten it.
- **Data tables.** `dataTable` takes a spec on `<Chart>` (off by default) and a boolean on the high-level charts (on by default). Widening the chart form to `boolean | { caption }` later is additive.
- **Sizing.** `margin: Partial<Margin>` merges over each chart's defaults. Charts derive `labelWidth` / `valueWidth` columns from the margin.
- **Accessible name.** `title` and `description` are plain strings wired to `aria-labelledby` / `aria-describedby`, the same on Chart and Heatmap. Callouts are `aria-hidden`, as documented.
- **Ids.** `Id = string | number`. LineChart, StripPlot and Heatmap use string ids ("x as string", `"series:row"`, `"row:column"`), as documented.
- **Look.** The tone × fill vocabulary, `TONES`, the `--ch-<tone>` role tokens and `data-ch-theme` stay.
- **Group names.** `data-ch-part` group names follow a rule worth writing down: plural for collections (`bars`, `dots`, `connectors`, `row-labels`), and `-group` for one mark plus its adornments (`line-group`, `area-group`, `target-group`).
- **Heatmap.** It stays an HTML grid without `ChartPassThroughProps`: no width, height or margin, since it is not an SVG figure.
- **`chartId` on Chart.**
- **Start types.** `BridgeStart` and `WaterfallStart` stay separate, though identical, so each can evolve on its own.

---

## Full exported surface (as of 0.5)

### `tally-charts` (root, `'use client'`)
- **From core:**
  - types: `BarAlign`, `FormatPreset`, `FormatSpec`, `Formatter`, `Formatters`, `BandScaleSpec`, `LinearScaleSpec`, `PointScaleSpec`, `ScaleSpec`, `ThresholdBin`, `ThresholdLegendItem`, `Thresholds`, `TickSpec`, `Accessor`, `Fill`, `Id`, `PerItem`, `SeqLevel`, `Tone`
  - values: `createFormatter`, `fmt`, `thresholds`, `TONES`
- **Root and provider:** `Chart`, `ChartProps`, `ChartsProvider`, `ChartsProviderProps`, `useFormat`, `UseFormatResult`, `DataTable`, `DataTableProps`, `DataTableSpec`, `DataTableColumn`
- **Charts:**
  - `BarChart` (+ `BarChartProps`)
  - `ComparisonBars` (+ `ComparisonBarsProps`, `ComparisonStatus`*)
  - `RankedBars` (+ `RankedBarsProps`)
  - `WaterfallChart` (+ `WaterfallChartProps`, `WaterfallStart`, `WaterfallStep`, `WaterfallEnd`, `WaterfallKind`*)
  - `BridgeChart` (+ `BridgeChartProps`, `BridgeStart`, `BridgeStep`)
  - `DotHistogram` (+ `DotHistogramProps`)
  - `StripPlot` (+ `StripPlotProps`, `StripSeries`)
  - `WaffleColumns` (+ `WaffleColumnsProps`)
  - `LineChart` (+ `LineChartProps`, `LineSeries`, `LineSeriesStyle`, `LineRange`*)
  - `Heatmap` (+ `HeatmapProps`, `HeatmapCell`)
  - `ChartPassThroughProps`
- **Marks:**
  - `Area` (+ `AreaProps`)
  - `Axis` (+ `AxisProps`, `AxisSide`, `AxisFormat`*)
  - `Band` (+ `BandProps`)
  - `Bars` (+ `BarsProps`*)
  - `ColumnHighlight` (+ `ColumnHighlightProps`)
  - `Connector` (+ `ConnectorProps`, `ConnectorLink`)
  - `Dots` (+ `DotsProps`, `DotItem`)
  - `Grid` (+ `GridProps`)
  - `Line` (+ `LineProps`, `LineDots`)
  - `NearestPointer` (+ `NearestPointerProps`)
  - `Region` (+ `RegionProps`)
  - `RowLabels`, `RowDividers` (+ `RowLabelsProps`, `RowDividersProps`)
  - `Target` (+ `TargetProps`)
  - `ValueLabel` (+ `ValueLabelProps`)
- **Overlays:** `Tooltip` (+ `TooltipProps`), `Callout` (+ `CalloutProps`)
- **Small UI:**
  - `Delta` (+ `DeltaProps`, `DeltaDirection`*)
  - `DotCount` (+ `DotCountProps`)
  - `InlineBar` (+ `InlineBarProps`)
  - `Legend` (+ `LegendProps`, `LegendItem`, `LegendShape`)
  - `Meter` (+ `MeterProps`)
  - `RangeMeter` (+ `RangeMeterProps`)
  - `Stat` (+ `StatProps`)
  - `TooltipPill` (+ `TooltipPillProps`)
- **Extension API:** `useChart`*, `ChartContextValue`*, `Margin`, `useRegisterPoints`*, `ChartPoint`, `PointGroup`, `TooltipSegment`, `ActiveSource`

### `tally-charts/core` (server-safe)
- **accessor\*:** `resolveAccessor`, `resolveIds`, `resolvePerItem`, `toFieldGetter`, `FieldGetter`
- **area\*:** `areaPath`, `AreaPoint`
- **bars\*:** `computeBars`, `BarAlign`, `BarDirection`, `BarLayout`, `BarLayoutInput`, `BarOrientation`, `BarRect`
- **dots\*:** `binDots`, `medianOf`, `stackStrip`, `BinnedDot`, `DotBinInput`, `DotBinLayout`, `StripDot`, `StripInput`, `StripLayout`
- **format:** `createFormatter`, `createFormatters`, `fmt`, `DEFAULT_CURRENCY`, `DEFAULT_LOCALE`, `FormatOptions`, `FormatPreset`, `FormatSpec`, `Formatter`, `Formatters`, `LocaleOptions`
- **line\*:** `bandPath`, `linePath`, `BandPoint`, `LinePoint`
- **linear:** `linearScale`, `niceDomain`, `clampToRange`*, `LinearScale`
- **number:** `toNumber`
- **placement\*:** `placeTooltip`, `Placement`, `PlacementInput`
- **scale:**
  - `createScale`*, `inferLinearDomain`, `categoryCenter`*, `categoryStep`*
  - `BandScaleSpec`, `LinearScaleSpec`, `PointScaleSpec`, `ScaleSpec`, `ResolvedScale`*
- **steps\*:** `runningTotals`, `StepTone`, `StepTotal`
- **text\*:** `CHAR_WIDTH`, `truncateLabel`
- **thresholds:** `thresholds`, `ThresholdBin`, `ThresholdLegendItem`, `Thresholds`
- **ticks\*:** `bandTicks`, `pointTicks`, `linearTicks`, `thinTicks`, `estimateWidth`, `MeasureTick`, `Tick`, `TickAnchor`; `TickSpec` stays public
- **types:** `TONES`, `Accessor`, `Fill`, `Id`, `PerItem`, `SeqLevel`, `Tone`
- **waffle\*:** `packWaffle`, `WaffleCell`, `WaffleLayout`
- **warn\*:** `createWarner`, `isDev`, `Warn`

\* changed or removed by a must-before-freeze proposal (API-1 to API-9).

### `tally-charts/theme.css`
- **Tokens:**
  - roles: `--ch-accent`, `--ch-accent-soft`, `--ch-loss`, `--ch-warn`, `--ch-gain`, `--ch-neutral`
  - text and surfaces: `--ch-ink`, `--ch-ink-muted`, `--ch-grid`, `--ch-surface`, `--ch-tooltip-bg`, `--ch-tooltip-ink`, `--ch-tooltip-shadow`
  - hatching: `--ch-hatch-tint`, `--ch-hatch-angle`, `--ch-hatch-width`, `--ch-hatch-gap`
  - misc: `--ch-font-numeric`, `--ch-radius`, `--ch-duration`, `--ch-ease`, `--ch-dim-opacity`, `--ch-tone-text-mix`
  - sequential: `--ch-seq-base`, `--ch-seq-mix-1…5`, `--ch-seq-1…5` (computed), `--ch-heatmap-cell-height`
  - private, per API-9: `--ch-swatch-color`, `--ch-range-ref-color`, `--ch-heatmap-columns`, `--ch-seq-ink-strong`
- **Attributes:**
  - `data-ch-theme`, `data-ch-root`, `data-ch-part` (about 45 values)
  - state: `data-ch-tone`, `data-ch-fill`, `data-ch-active`, `data-ch-dimmed`, `data-ch-selectable`, `data-ch-animate`
  - variants: `data-ch-dir` / `data-ch-direction`, `data-ch-side`, `data-ch-variant`, `data-ch-dashed`, `data-ch-hollow`, `data-ch-soft`, `data-ch-muted`, `data-ch-shape`, `data-ch-size`
  - placement and heatmap: `data-ch-placement`, `data-ch-level`, `data-ch-seq-tone`, `data-ch-totals`
- **Classes:** about 55 `ch-*` classes. They are private in the spec but de-facto public today (API-9).
