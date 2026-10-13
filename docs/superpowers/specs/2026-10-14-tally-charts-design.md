# tally-charts — Design Spec

Date: 2026-10-14
Status: Approved in brainstorming, pending written-spec review

## 1. Purpose and positioning

`tally-charts` is a public, open-source React chart library for narrative business dashboards. Its differentiator is an opinionated, semantic visual language taken from the reference designs (gross margin / leakage / forecast dashboards):

- **Hatched = reference / plan / lost**, **solid = actual / now**.
- Semantic color roles: blue = actual, pink = loss/leakage, orange = warning, green = gain/on target, grey = neutral reference.
- Targets are first-class (dashed rule or tick plus a quiet label).
- Charts carry a takeaway sentence; tooltips are segmented pills (`#5819 | 12.3% | ABC Property Group`).

Other libraries (Recharts, Visx, Nivo, Tremor) are general-purpose. tally-charts has the visual rules built in.

### Success criteria

1. Each of the 7 reference screenshots can be recreated with the library in about 20–40 lines of JSX per card. These recreations are the visual regression baseline.
2. Renders on the server with no errors (Next.js App Router); light and dark themes.
3. Accessible by default: keyboard navigation, screen-reader announcements, accessible figure name and description, optional hidden data table, axe-clean.
4. Bundle budgets: `core` ≤ 8 KB, a single chart ≤ 15 KB (min+gzip, d3 modules included).

### Non-goals (v1)

- Frameworks other than React; Web Components.
- Cards, layout, buttons, tables, toggle cards, insight callout boxes (shown in docs as examples only).
- Drill-down column component (documented example built from `RankedBars` instead).
- Step timeline ("What happened").
- Brushing, zoom, pan, drag, multi-select, a dedicated touch interaction model.
- Brand palettes beyond the six tone roles; categorical palettes with more than six colors.

## 2. Visual language: tone × fill, tokens

Two independent props per mark:

- **`tone`** (color role): `accent` | `accent-soft` | `loss` | `warn` | `gain` | `neutral`.
- **`fill`** (treatment): `solid` | `hatch` | `hatch-fade` (hatch masked by a vertical gradient toward the baseline).

Each high-level chart sets defaults (e.g. `BarChart`: history `hatch-fade`, last point `solid`). Both props accept a constant or a per-item function `(d, i, all) => value`.

### Tokens (CSS custom properties, `--ch-` prefix)

| Group | Tokens |
|---|---|
| Roles | `--ch-accent`, `--ch-accent-soft`, `--ch-loss`, `--ch-warn`, `--ch-gain`, `--ch-neutral` |
| Text and surfaces | `--ch-ink`, `--ch-ink-muted`, `--ch-grid`, `--ch-surface`, `--ch-tooltip-bg`, `--ch-tooltip-ink` |
| Hatching | `--ch-hatch-angle`, `--ch-hatch-width`, `--ch-hatch-gap` |
| Sequential | `--ch-seq-1` … `--ch-seq-5` (built from loss by default; `Heatmap tone` changes the base) |
| Misc | `--ch-font-numeric` (tabular numbers), `--ch-radius`, `--ch-duration` (400ms), `--ch-ease`, `--ch-dim-opacity` (0.35) |

`tally-charts/theme.css` ships light and dark values. Dark mode follows `prefers-color-scheme` unless an ancestor sets `[data-ch-theme="light"|"dark"]`.

### Rendering hatching

- **SVG:** each `<Chart>` renders one shared `<defs>` holding one `<pattern>` for each of the six tones (always all six, so server and client output are identical) and two fade masks. IDs are scoped with `useId`, so they're deterministic during server rendering and don't clash between charts. Pattern colors and stroke width read the CSS variables, so a theme change needs no re-render. Pattern attributes can't use CSS variables, so the root reads the hatch angle and gap tokens from computed style after mount (server rendering uses the defaults). `hatch-fade` adds a gradient `<mask>`.
- **HTML pieces:** `repeating-linear-gradient` driven by the same tokens, so legend swatches, meters and inline bars match the SVG exactly.

## 3. Architecture

Four layers, each depending only on the ones above it.

### 3.1 `core` (plain TypeScript, no React) — exported as `tally-charts/core`

Pure, unit-tested functions:

- Scales: band scales from `d3-scale`; a small built-in linear scale using `d3-array` `ticks`/`nice`. (`d3-scale`'s linear scale alone costs about 7.6 KB min+gzip because of d3-format/d3-interpolate/d3-color, which would break the 8 KB `core` budget.) Point and time scales arrive with `LineChart` (0.5). Nice ticks; domain inference with padding for flat or single-value data.
- Layout: waterfall steps (cumulative start/end per step, automatic `gain`/`loss`), bridge columns (remaining + leaked cap), dot binning and stacking (histogram), waffle column packing, strip-plot row stacking and medians, heatmap threshold bins.
- `thresholds(breaks, tones, labels)` → a tone-by function plus legend entries with counts.
- Formatters on `Intl.NumberFormat`: `currency`, `currency-compact`, `percent`, `pts`, `number`, `hours`; true minus sign (−) and explicit `+` on changes.

Runtime dependencies: `d3-scale` (band only), `d3-array`, and `d3-shape` (from 0.3) only.

### 3.2 `<Chart>` root

- **Size:** `ResizeObserver` on the container for width (or a fixed `width` prop, which turns measuring off); `height` or `aspectRatio` for height (no layout shift). Server rendering uses `initialWidth` (default 640) and re-lays out on the client.
- **Scales:** declared as props, including the field each axis reads (`x={{ type: 'band', field: 'week', padding: 0.3 }}`, `y={{ field: 'margin', domain: [0, 40] }}`). Domains are inferred from `<Chart data>` and the field when omitted. Inference happens in the root during render, so server and client output match. Building blocks use the chart's fields unless they pass their own `x`/`y`.
- **Pattern defs:** the root renders the shared `<defs>` (see Section 2).
- **Interaction store:** active id, source (hover/focus/controlled), `activeId` / `onActiveChange` / `onSelect`.
- **Layers:** an `<svg>` for marks plus an absolutely positioned HTML layer for tooltips, callouts and multi-line labels.
- **Accessibility:** `role="figure"`, accessible name from `title`, accessible description from `description`, live region, optional hidden `dataTable`.

### 3.3 Building blocks (read `<Chart>` context)

| Group | Building blocks |
|---|---|
| Marks | `Bars` (including stacked/overflow segments), `Dots`, `Line`, `Area`, `Band` |
| Reference marks | `Target` (dashed line or tick + label), `Connector` (dotted step lines) |
| Axes and labels | `Axis` (labels only by default), `Grid`, `ValueLabel` |
| Overlays | `Tooltip`, `Callout` (pinned tooltip with optional stem), `ColumnHighlight` (backdrop behind a column) |

Data comes from the block's own `data` prop or is inherited from `<Chart data>`. Accessors are `keyof D | (d, i) => V`.

Example (12-week card):

```tsx
<Chart data={weeks} height={240} x={{ type: 'band', field: 'week', padding: 0.3 }} y={{ field: 'margin', domain: [0, 40] }}>
  <Target y={38} label="Target 38%" />
  <Bars fill={(d, i, all) => (i === all.length - 1 ? 'solid' : 'hatch-fade')} />
  <ValueLabel at="last" format={(v) => v.toFixed(1)} />
  <Axis side="bottom" ticks="ends" />
</Chart>
```

### 3.4 High-level charts

Thin compositions of the building blocks (about 80–150 lines each), source linked from the docs so users can copy and adapt.

**Data flow:** data → accessors → `core` layout (memoized) → scales → marks → interaction context → tooltip/callout.

## 4. v1 catalog

### Charts

| Component | Reference screenshot | What's specific to it |
|---|---|---|
| `BarChart` | Last 12 weeks | Vertical or horizontal; history `hatch-fade`, current `solid`; target; last value label |
| `ComparisonBars` | Estimate vs actual | Hatched plan bar above solid actual bar; over-run as a separate pink hatched segment; right column `$640 → $1,060  +$420` or "On plan" |
| `RankedBars` | Where the $860 went; drill columns; toggle-card bars | Label + bar on a faint track + value; selectable rows via `activeId` |
| `WaterfallChart` | Why it is under target | Horizontal; start (neutral hatch) → steps (loss/gain) → end (accent solid, calculated); dotted connectors; label row above each bar, value on the right |
| `BridgeChart` | Planned $1,260, kept $400 | Vertical; remaining + leaked cap per column; gradient area joining the tops; highlighted final column; two-line labels |
| `DotHistogram` | 158 jobs by margin | One dot per item, binned on x and stacked; `toneBy` thresholds → legend with counts; target; pinned callout |
| `StripPlot` | 29 Dallas installs | One dot row per group, stacked where they overlap; dashed median line with label |
| `WaffleColumns` | Profit leaked (Aug vs Sep) | A column of dots per period; groups tinted by tone; peak callout |
| `LineChart` | Margin outlook | Series styles `actual` / `forecast` (dashed, hollow end dots) / `scenario`; `Band` for the likely range; shaded forecast region; target; one tooltip for all series at a given x |
| `Heatmap` | Where it leaks | HTML CSS grid (`role="grid"`); header and total rows/columns; threshold bins → legend |

### Small UI pieces (HTML, same tokens)

`Stat`, `Delta` (▲/▼ pill, tone from the sign or explicit), `Meter` (progress + target tick), `RangeMeter` (filled dot → hatched gap → empty ring), `InlineBar` (table-cell bar + target tick), `DotCount`, `Legend` (swatches copy the fill exactly), `TooltipPill` (segmented; also used by `Callout`).

### Release order

| Version | Contents |
|---|---|
| 0.1 | Tokens, `theme.css`, `core`, `<Chart>`, `Bars`, `Axis`, `Target`, `Tooltip`, `Legend` |
| 0.2 | `BarChart`, `ComparisonBars`, `RankedBars`, all small UI pieces |
| 0.3 | `WaterfallChart`, `BridgeChart` |
| 0.4 | `DotHistogram`, `StripPlot`, `WaffleColumns` |
| 0.5 | `LineChart`, `Heatmap` |
| 1.0 | API freeze, docs site, accessibility audit |

## 5. Interaction, motion, accessibility

### Active point

- At most one active point per chart, identified by the `id` accessor (default: index).
- **Uncontrolled:** hover/focus sets it, leaving the chart clears it. **Controlled:** `activeId` + `onActiveChange(id, point | null)`; sharing one `activeId` links views (e.g. table row ↔ dot).
- **Rendering:** the active mark gets emphasis (ring on dots, full opacity on bars); other marks dim to `--ch-dim-opacity`. Turn off with `dimInactive={false}`.
- **Hit areas:** bars use their band area (full height); dots use the nearest point within a radius; lines snap to the nearest x and activate every series at that x.

### Tooltip / Callout

- `Tooltip` follows the active point in the HTML layer, flips at the edges and stays inside the chart.
- Default content is `TooltipPill` segments; override with `content={(point) => ReactNode}`.
- `Callout` is pinned to an id or a data value regardless of hover, with an optional stem line.

### Keyboard and screen readers

- **Keyboard:** the chart is one tab stop. Arrow keys move through data order (←/→ for x order; ↑/↓ for stacked dots or rows), Home/End jump to the ends, Escape clears, Enter/Space call `onSelect`. Focus shows the same tooltip as hover.
- **Announcements:** a live region reads `ariaLabel(point)`; defaults are built from the formatters ("Labor overruns, −1.6 points, $7.7K").
- **Data table:** hidden `dataTable`, on by default for high-level charts.
- **Color isn't the only signal:** hatched vs solid carries meaning alongside color; docs include a contrast check of the default tokens in both themes.

### Motion

- **Mount:** bars grow from the baseline, dots fade and rise, lines draw in. **Data changes:** marks tween to their new positions.
- **Implementation:** CSS transitions for SVG attributes; the Web Animations API for path morphs. No animation library.
- **Settings:** `--ch-duration`, `--ch-ease`. `prefers-reduced-motion` or `animate={false}` disables motion. Server output is in its final state.

## 6. Public API conventions

- **Shared prop names:**
  - **Data and fields:** `data`, `x`, `y`, `id`, `label`, `series`
  - **Look:** `tone`, `fill`, `format`
  - **Size:** `height` / `aspectRatio`, `initialWidth`
  - **Text:** `title`, `description`
  - **Interaction:** `activeId`, `onActiveChange`, `onSelect`, `animate`, `dimInactive`
  - **Styling hooks:** `className`, `style`
- **Typed generic accessors:** `type Accessor<D, V> = keyof D | ((d: D, i: number) => V)`; `<BarChart<Week> x="week" y="margin" />` is checked against `Week`.
- **`toneBy` + `thresholds()`:** threshold categories that drive both tones and `Legend` counts.
- **Formatting:**
  - **Presets:** `'currency' | 'currency-compact' | 'percent' | 'pts' | 'number' | 'hours'`
  - **Custom:** any `(v: number) => string`
  - **`fmt` export:** the presets are also exported as plain functions (`fmt.currencyCompact(82400)`, `fmt.pts(-1.6)`) for use in labels and tooltips; they honor `ChartsProvider` defaults when called inside it via `useFormat()`
  - **App defaults:** `<ChartsProvider locale currency>`. Without it the library defaults to `en-US` and USD (a fixed default keeps server and client output identical; using the browser's locale would cause hydration mismatches).
- **Extension:**
  - **`children`:** high-level charts render `children` inside their `<Chart>` after their own marks (extra `Target`, `Callout`, custom blocks reading the same scales).
  - **Part attributes:** every element has `data-ch-part`, `data-ch-tone`, `data-ch-fill` for CSS targeting; class names are not API.
- **Types:**
  - **Exports:** strict TypeScript, all prop types exported (`BarChartProps<D>`), no `any` in the public API.
  - **No internals in exports:** there's no exported internal path.
- **Versioning:** strict semantic versioning from 1.0; breaking changes listed in the changelog during 0.x.

Example:

```tsx
<WaterfallChart
  title="Why it is under target"
  description="Labor and materials explain two thirds of the gap."
  start={{ label: 'Target', value: 38 }}
  steps={[
    { label: 'Labor overruns', value: -1.6, meta: 7700 },
    { label: 'Material variance', value: -1.1, meta: 5300 },
  ]}
  end={{ label: 'Actual' }}
  format="percent"
  stepLabel={(s) => `${fmt.pts(s.value)} · ${fmt.currencyCompact(s.meta)}`}
/>
```

## 7. Edge cases and errors

- **Missing data:**
  - **Empty data:** `empty` slot (default muted "No data") at full chart size.
  - **Bad values:** `null` / `NaN` / `undefined` values are skipped; one development warning per chart naming the field.
- **Data shape:**
  - **Negative values:** bars extend below a zero baseline; positive waterfall steps become `gain` automatically.
  - **Single point or flat range:** the domain is padded.
  - **Duplicate ids:** development warning, fall back to index.
- **Space:**
  - **Long labels:** truncated with an ellipsis; full text in the tooltip and aria label.
  - **Narrow containers:** axis labels thin out step by step (every other, then ends only).
  - **Too many dots:** dots shrink down to a minimum radius, then warn.
- **No runtime throws for bad data.** Throws are kept for programmer errors (e.g. a building block outside `<Chart>`). Development warnings are removed in production builds via `process.env.NODE_ENV`.

## 8. Testing

- **Unit tests (Vitest):** all of `core` (layout algorithms, thresholds, formatters across locales).
- **Component tests** (Vitest + Testing Library):
  - **Render output:** counts of `data-ch-part` elements per data set.
  - **Interaction:** controlled vs uncontrolled active point, keyboard navigation.
  - **Accessibility:** aria labels.
  - **Server rendering:** `renderToString` produces no errors and deterministic IDs.
- **Visual regression** (Playwright screenshots of Storybook stories): the 7 reference screenshots rebuilt as stories, light and dark.
- **Accessibility:** axe-core on every story in CI.
- **Bundle size:** `size-limit` budgets from Section 1; CI fails when exceeded.

## 9. Tooling and packaging

- **Repo layout:** pnpm workspace with `packages/tally-charts` and `apps/storybook`. Docs site deferred to 1.0.
- **Build:** `tsdown` (ESM + `.d.ts`; tsup is maintenance-only). TypeScript pinned to 6.x until the tooling (Storybook prop docs) supports the TypeScript 7 native compiler. ESM-only; `sideEffects: ["*.css"]`.
- **Subpath exports:** `tally-charts` (charts, building blocks, small UI pieces), `tally-charts/core`, `tally-charts/theme.css`.
- **Peer dependencies:** `react` and `react-dom` 18 or 19.
- **Code quality:** TypeScript strict, Biome (lint + format), Changesets.
- **CI:** GitHub Actions running typecheck → lint → test → build → size → visual + accessibility.
- **License:** MIT.
