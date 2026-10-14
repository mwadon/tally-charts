# tally-charts accessibility pre-audit (1.0)

Date: 2026-10-14. Scope: every Storybook story at http://localhost:6006 (29 stories, 17 distinct
light/primitive stories plus their dark twins), library source in `packages/tally-charts/src`,
intentions in `docs/superpowers/specs/2026-10-14-tally-charts-design.md` §5. Read-only: no repo
file was changed. All scripts and raw output live in
`docs/superpowers/specs/assets/0.6-a11y-audit/` (scripts only; the raw JSON results and screenshots were not kept).

## Summary

| Severity | Count |
|---|---|
| Blocker | 0 |
| Serious | 9 |
| Minor | 9 |

| ID | Severity | WCAG SC | Area | Public API change |
|---|---|---|---|---|
| A11Y-1 | serious | 4.1.2, 2.1.1 (AT users), 3.3.2 | Chart keyboard model is a focusable `<figure>`; screen readers stay in browse mode | No (optional additive prop if hint text is configurable) |
| A11Y-2 | serious | 1.4.3 | SVG labels and tooltip values painted in the raw tone (1.92–4.09:1) | No |
| A11Y-3 | serious | 1.4.11 | Light-theme tones `warn`, `gain`, `neutral`, `accent-soft` under 3:1 as marks | No (token values change) |
| A11Y-4 | serious | 1.4.11, 1.1.1 (forced colors) | Legend swatches, Meter, InlineBar, RangeMeter dot, DotCount, heatmap levels vanish in forced colors | No |
| A11Y-5 | serious | 2.4.7 (forced colors) | Heatmap cell focus indicator disappears in forced colors | No |
| A11Y-6 | serious | 1.4.3, 1.4.11 (forced colors) | SVG text and marks ignore forced colors; light-pinned charts render ink text on a black Canvas | No |
| A11Y-7 | serious | 1.3.1, 4.1.2 | Heatmap column headers include the column total; empty corner header (axe `empty-table-header`) | Additive optional prop |
| A11Y-8 | serious | 1.4.10 | 320 px reflow: Heatmap cells overlap, ComparisonBars loses bars and values, Bridge/Waterfall labels collide, callouts overflow | Additive (ComparisonBars layout) |
| A11Y-9 | serious | 1.4.11 (legend), design | Heatmap ramp: dark levels 4 and 5 identical (1.04–1.23:1), dark accent-soft/neutral non-monotonic; light levels 1–4 at 1.07–2.55:1 vs surface | No (token values change) |
| A11Y-10 | minor | 1.4.13 | Hover tooltip cannot be dismissed with Escape; NearestPointer tooltip not hoverable | No |
| A11Y-11 | minor | 1.3.1 | Data table: raw field-name headers, empty cells, no row headers, headers not overridable | Additive (`dataTable` accepts an object) |
| A11Y-12 | minor | 2.4.6 / 3.3.2 (advisory) | Announcements lack series and position; focus alone shows nothing (spec says it should) | No |
| A11Y-13 | minor | 1.4.11 | Hatch gaps, hatch-fade ends, soft dots, dimmed marks, bands: 1.08–2.28:1 | No |
| A11Y-14 | minor | 1.4.11 | Grid lines, bar/meter tracks, heatmap level-0 border: 1.11–1.31:1 | No |
| A11Y-15 | minor | 2.1.1 (APG grid) | Heatmap totals unreachable by grid navigation; Ctrl+Home/End and PageUp/PageDown not handled | No |
| A11Y-16 | minor | 2.4.3 (advisory) | `<Chart>` is always a tab stop, even with no interactive points | No |
| A11Y-17 | minor | 1.4.1 | LineChart legend doesn't show the hollow and solid dots that tell "Current path" from "With your changes" | No |
| A11Y-18 | minor | process | The CI axe run skips `best-practice`/`wcag22aa`, and axe returns "incomplete" for every SVG text node | No |

### What passed

- **axe** (wcag2a/aa, wcag21a/aa, wcag22aa, best-practice) over 58 runs (29 stories × light and dark globals): one rule failed, `empty-table-header` on the heatmap corner cell (see A11Y-7). Every story had `color-contrast` "incomplete" results: 3–37 nodes per story, all SVG `text` (`bgOverlap`/`imgNode`) plus `.ch-delta-arrow` (`nonBmp`). These were measured separately, see A11Y-2.
- **Reduced motion:** with `reducedMotion: 'reduce'`, `document.getAnimations()` returns 0 at load and after keyboard interaction in all 17 stories. Without it the counts are 4–158 at load (for example `jobs-by-margin` 158, `dallas-installs` 58), so the theme's `@media (prefers-reduced-motion: reduce)` block works.
- **Focus ring on the chart:** `outline: 2px solid var(--ch-accent)`, offset 4px. Contrast is 4.49:1 on surface and 3.97:1 on the Storybook canvas in light, 5.49:1 and 4.78:1 in dark. In forced colors it becomes the system highlight color, so it stays visible.
- **Keyboard:** each chart is one tab stop and there's no trap (Tab leaves, Shift+Tab returns). Arrow keys, Home and End move the active point. Escape clears it and is only consumed while something is active. Enter calls `onSelect`: `last-12-weeks--selectable` shows "Selected: Jul 6" and `drill-columns` updates its testid. The live region (`aria-live="polite"`) exists from mount and only announces keyboard moves. Heatmap uses a roving tabindex: exactly one cell has `tabindex="0"` after every move, and Shift+Tab returns to the last focused cell.
- **Text spacing (1.4.12):** after injecting the 1.4.12 styles at 1280 px, no new SVG label overlaps or clipped HTML labels appeared in any story.
- **Zoom 200% (1280 px window shown as 640 CSS px at 2×):** no horizontal scroll and no label overlaps in any story.
- **Names and descriptions:** every high-level chart exposes `figure "<title>"` with a description, and all of them except `LastTwelveWeeks` (low-level `<Chart>`) include a hidden data table. `Meter` (`role="meter"` with `aria-valuetext`), `RangeMeter` (`role="img"`) and `Delta` (sr-only "Up"/"Down") have sensible names.

---

## Findings

### A11Y-1: Keyboard chart is a focusable `<figure>`, so screen readers don't reach the arrow keys (serious)

- **WCAG:** 4.1.2 Name, Role, Value; 2.1.1 Keyboard, for screen-reader users; 3.3.2 (no instructions).
- **Affected:** everything built on `<Chart>`: BarChart, LineChart, RankedBars, ComparisonBars, WaterfallChart, BridgeChart, DotHistogram, StripPlot, WaffleColumns. That covers every story with a `figure[tabindex="0"]`, 14 of 17.
- **Evidence:** Chrome's AX tree for `reference-last-12-weeks--light` shows `figure "Margin by week, last 12 weeks" desc="…" focusable=true`. The element has no widget role, no `aria-roledescription`, no `aria-activedescendant`, and no instructions. NVDA and JAWS only switch to focus mode for widget roles. On a focusable `figure` they stay in browse mode, so ←/→/Home/End move the virtual cursor and `Chart.tsx`'s `onKeyDown` never runs. The active point is exposed only through the live region (`Chart.tsx` ~L226), never as focus or an active descendant. **Manual NVDA, JAWS and VoiceOver check required.**
- **Fix (`packages/tally-charts/src/react/Chart.tsx`):**
  - Keep `<figure>` as the labelled container. Move `tabIndex`, `onKeyDown` and `onBlur` to an inner `<div role="application" aria-roledescription="chart" aria-labelledby={titleId} aria-describedby={`${descId} ${hintId}`}>` that wraps the svg and overlay.
  - Add a hidden hint span: "Use arrow keys to move between points, Home and End for first and last, Escape to clear" (plus ", Enter to select" when `onSelect` is set).
  - Leave the `DataTable` outside the application element, so browse mode can still read it.
  - Optionally add an ARIA 1.2 alternative later: a hidden `role="listbox"` of points with `aria-activedescendant`.
  - Update the e2e selectors that use `getByRole('figure')` and `chart.focus()`.
- **Public API:** no. Optional additive `keyboardHint?: string` if the hint should be localizable.

### A11Y-2: SVG labels and tooltip values in the raw tone fail 4.5:1 (serious)

- **WCAG:** 1.4.3 Contrast (Minimum).
- **Evidence (pixel-measured, script `rendered-contrast.mjs`, 1,057 text runs):**

| Element (selector) | Story | fg on bg | Ratio |
|---|---|---|---|
| `[data-ch-part=row-label][data-ch-tone=neutral]` "On plan" | estimate-vs-actual (light) | #a3a3ab on #fafafa | **2.40** |
| `[data-ch-part=row-label][data-ch-tone=loss]` "$31.2K", "+$420" | drill-columns, estimate-vs-actual (light) | #e5368d on #fafafa/#fff | **3.61** |
| `[data-ch-part=column-note]` "−$260 discount" | profit-bridge (light) | #e5368d on #fafafa | **3.50** |
| `[data-ch-part=group-label]` "September" | profit-leaked (light) | #e5368d on #fafafa | **3.84** |
| `.ch-pill-seg[data-ch-tone] .ch-pill-value` | dallas-installs (accent-soft), profit-leaked (neutral), estimate-vs-actual / bridge / result / waterfall (loss) | light: 1.92 / 2.50 / 4.00; dark: 4.09 (accent-soft), 4.06 (neutral) | **fail** |

  Computed for every tone (`contrast-tokens.mjs`), raw tone as pill text on `--ch-tooltip-bg`: light accent 4.69, accent-soft 1.92, loss 4.00, warn 2.11, gain 3.06, neutral 2.50; dark accent-soft 4.09, neutral 4.06. The HTML `.ch-tone-text` mix (55% tone + ink) passes everywhere: light 4.85–9.41, dark 7.89–12.95.
- **Fix:** paint toned text with the same mix HTML already uses, `color-mix(in srgb, var(--ch-<tone>) var(--ch-tone-text-mix), var(--ch-ink))`:
  - `react/marks/RowLabels.tsx` L103: `style={tone ? { fill: … } : undefined}`
  - `react/charts/BridgeChart.tsx` L137 (`column-note`)
  - `react/charts/WaffleColumns.tsx` L164 (`group-label`)
  - `theme/theme.css` `.ch-pill-seg[data-ch-tone] .ch-pill-value`: change `color: var(--ch-swatch-color)` to the mix.

  The cleanest version sets `--ch-swatch-color` inline and adds CSS rules `[data-ch-part="row-label"][data-ch-tone], [data-ch-part="column-note"], [data-ch-part="group-label"][data-ch-tone] { fill: color-mix(...) }`, then extends `theme.test.ts` to check them.
- **Public API:** no. The rendered color changes.

### A11Y-3: Light-theme tones under 3:1 as data marks (serious)

- **WCAG:** 1.4.11 Non-text Contrast.
- **Evidence:** solid tone against `--ch-surface` #fafafa, light theme: accent 4.49, loss 3.84, **gain 2.93, neutral 2.40, warn 2.02, accent-soft 1.84**. Dark theme: all six pass (4.53–10.44). Real uses where the color is the only cue for a mark:
  - `dallas-installs`: "Estimated" dots, accent-soft #9dbcf6
  - `jobs-by-margin`: dot groups #f1a23b (warn), #9dbcf6, #23a866
  - `why-it-is-under-target`: "Target" bar, hatched neutral
  - `estimate-vs-actual`: estimate bars, hatched accent-soft
  - `margin-outlook`: likely-range area
- **Fix (`theme/theme.css`, light block):** darken the light tokens to at least 3:1 on the surface. Computed suggestions:
  - warn #f1a23b → #be802f (3.18)
  - gain #23a866 → #22a363 (3.10)
  - neutral #a3a3ab → #8e8e95 (3.12)
  - accent-soft #9dbcf6 → #778fbb (3.13)

  Or keep the soft tones only for marks paired with a ≥3:1 outline (`stroke: color-mix(tone 55%, ink)`, 1px). Add a 3:1 tone-vs-surface case to `theme.test.ts`. After the change, re-check heatmap level 5 and hatch tint.
- **Public API:** no. Token values change, which is visible in snapshots.

### A11Y-4: Forced colors: HTML-painted marks disappear (serious)

- **WCAG:** 1.4.11, 1.1.1, in forced-colors / Windows High Contrast.
- **Evidence:** `motion-forced.mjs` with `forcedColors: 'active'` gives these computed values in both color schemes:
  - `.ch-swatch` `background-color` becomes Canvas or transparent and `background-image: none`, so every legend swatch vanishes, hatch included.
  - `.ch-meter-fill` becomes transparent and `.ch-meter-track` Canvas at 0.55, so **Meter shows nothing**. Screenshot `shots/forced-light-reference-gross-margin--light.png`: only the "20%" and "Target 38%" labels remain.
  - `.ch-inline-bar-fill` becomes transparent (7 of 7 in small-pieces).
  - `.ch-range-dot` becomes Canvas, so the actual-value dot is invisible (the ring survives as a border).
  - `.ch-dot` (DotCount, 69 dots) becomes Canvas at 0.45.
  - `.ch-heatmap-cell` becomes Canvas, so all five levels look identical (`shots/forced-dark-reference-where-it-leaks--light-focus.png`).
  - `.ch-pill` loses its only boundary, a box-shadow.
- **Fix (`theme/theme.css`):** add an `@media (forced-colors: active)` block:
  - `.ch-swatch, .ch-meter-fill, .ch-inline-bar-fill, .ch-range-dot, .ch-dot, .ch-heatmap-cell { forced-color-adjust: none; }`. This keeps the data colors, which matches how the SVG already behaves.
  - Add `border: 1px solid CanvasText` to `.ch-meter-track`, `.ch-inline-bar`, `.ch-pill`, `.ch-delta` and `.ch-heatmap-cell[data-ch-level="0"]`.
  - Or map fills to `CanvasText`/`Highlight`, with hatch kept as a `repeating-linear-gradient` under `forced-color-adjust: none`.
- **Public API:** no.

### A11Y-5: Forced colors: heatmap focus indicator is invisible (serious)

- **WCAG:** 2.4.7 Focus Visible.
- **Evidence:** `.ch-heatmap-cell` sets `outline: none`, and its `:focus-visible` ring is a `box-shadow`. Forced colors drops box-shadow, so the focused cell shows `outline: none 3px …; boxShadow: none` (`motion-forced.json`, `reference-where-it-leaks--light` forced-light/dark), and the screenshot shows no ring. The figure-level ring uses `outline` and survives. `.ch-heatmap-cell[data-ch-active]` (box-shadow elevation) disappears too.
- **Fix (`theme/theme.css`):** replace `outline: none` with `outline: 2px solid transparent; outline-offset: 2px` on `.ch-heatmap-cell`, and set `outline-color: var(--ch-accent)` on `:focus-visible`, keeping the box-shadow as decoration. Forced colors then paints the transparent outline in the system color. Use the same transparent-outline trick for `[data-ch-active]`.
- **Public API:** no.

### A11Y-6: Forced colors: SVG text and marks keep author colors (serious)

- **WCAG:** 1.4.3 and 1.4.11 under forced colors.
- **Evidence:** Chromium leaves SVG `fill`/`stroke` alone (computed `fill=rgb(17,17,20)` for labels) but forces the HTML page background to Canvas. When a chart's theme doesn't match the high-contrast scheme (`data-ch-theme="light"` pinned by the app, as in every `--light` story, with a dark HC theme), ink #111114 text sits on #000 Canvas at about 1.1:1. `shots/forced-dark-reference-estimate-vs-actual--light-focus.png` shows invisible "Labor", "Materials" and "$640 → $1,060". Muted axis labels #6b6b73 on black are about 3.9:1, and grid lines disappear.
- **Fix (`theme/theme.css`):** inside `@media (forced-colors: active)`:
  - `.ch-svg text { fill: CanvasText }`, `[data-ch-part="axis-label"], [data-ch-part="row-sublabel"] { fill: GrayText }`
  - `[data-ch-part="grid-line"], [data-ch-part="row-divider"] { stroke: GrayText }`, `[data-ch-part="target"], [data-ch-part="connector"] { stroke: CanvasText }`
  - `[data-ch-part="line"] { stroke: CanvasText }` for single-series charts, or keep tones under `forced-color-adjust: none` with a CanvasText outline on bars and dots (`stroke: CanvasText; stroke-width: 1`)
  - also override the `--ch-*` theme tokens to system colors (`--ch-ink: CanvasText; --ch-surface: Canvas; --ch-grid: GrayText; …`) so HTML pieces follow.
- **Public API:** no.

### A11Y-7: Heatmap header semantics: totals inside column headers, empty corner (serious)

- **WCAG:** 1.3.1 Info and Relationships; 4.1.2.
- **Evidence:** Chrome AX tree for `reference-where-it-leaks--light` (`axtree-reference-where-it-leaks--light.txt`):
  - `columnheader "Labor $31.2K"`, `"Materials $18.7K"` and so on. DOM `textContent` is `"Labor$31.2K"` with no separator; the space appears only because grid layout blockifies the spans.
  - Each cell is announced with its column header, e.g. "Labor $31.2K, $14.8K". Two money figures, and nothing says the first is a column total.
  - `columnheader ""` in the corner: axe `empty-table-header` (best-practice, minor impact), `.ch-heatmap-corner`, in both themes.
  - The row-total column is labelled "Total", but its header's visual position mixes it with the column totals.
- **Fix (`react/charts/Heatmap.tsx` ~L338–350):**
  - Make the column header text only `{name}`. Move column totals to their own `role="row"` with `<div role="rowheader">{totalLabel}</div>` and plain `gridcell`s. It can stay visually on top by using CSS order, or move to the bottom.
  - Minimal alternative: wrap the total as `<span className="ch-heatmap-header-total"><span className="ch-sr-only">, {totalLabel} </span>{value}</span>` and give the header `aria-label={name}`, so totals stay visible but aren't part of the header name.
  - Give the corner `<span className="ch-sr-only">{rowLabel}</span>`, using a new optional `rowLabel?: string` prop (default "Row" or the `row` accessor key, as with `headerOf`).
- **Public API:** additive optional `rowLabel` (and possibly `columnLabel`).

### A11Y-8: Reflow at 320 px (serious)

- **WCAG:** 1.4.10 Reflow.
- **Evidence (`reflow.mjs`, light stories, 320 × 640, screenshots `shots/reflow-320-*.png`):**
  - **Heatmap** (`where-it-leaks`): headers and cell text overlap and can't be read ("$1.9K$3.9K…" drawn on top of each other). 6+ cells have `scrollWidth > clientWidth`, and the grid is exactly 230 px wide, so nothing scrolls. Cause: `minmax(0,1fr)` columns with nowrap text. A heatmap counts as a 2-D layout, so a horizontal scroll container is allowed, but overlap isn't.
  - **ComparisonBars** (`estimate-vs-actual`): with the fixed `labelWidth=240` and `valueWidth=220` (`ComparisonBars.tsx` L103–105) and a 200 px figure, the plot area is 0. All bars disappear, and 12 value labels sit at x 332–520 px, outside the viewport and clipped.
  - **BridgeChart** (`profit-bridge`): "$1,260" overlaps "−$260 discount". The pinned callout pill is wider than the card, so the page scrolls horizontally (`scrollWidth` 358).
  - **DotHistogram** (`jobs-by-margin`): the callout pill overflows (`scrollWidth` 343).
  - **Waterfall/RankedBars** (`why-it-is-under-target`): the left row label collides with the right value ("Material variance" × "−1.1 pts · $5.3K", "Labor overruns" × "−1.6 pts"). The spec's "truncated with an ellipsis" behavior doesn't happen at this width.
  - `last-12-weeks--selectable` uses a fixed-width chart (464 px) and scrolls to 552 px. That comes from the story, not the library.
  - At 200% zoom (640 CSS px) all stories pass.
- **Fix:**
  - `Heatmap.tsx`/`theme.css`: wrap `.ch-heatmap-grid` in `overflow-x: auto` with `role="group"`/`tabindex="0"` only while it overflows, or set `minmax(var(--ch-heatmap-min-cell, 56px), 1fr)` with a scroll container.
  - `ComparisonBars.tsx`: below a threshold (`innerWidth < labelWidth + valueWidth + 120`), stack the value columns under the label (2-row layout) or scale `labelWidth`/`valueWidth` in proportion.
  - `RowLabels.tsx`: pass `maxWidth` for both sides and use `core/text.ts` truncation.
  - `core/placement.ts`/`Callout.tsx`: clamp the callout to the chart's own width and allow wrapping.
- **Public API:** ComparisonBars may need an additive `layout?: 'auto' | 'columns' | 'stacked'`. Otherwise none.

### A11Y-9: Heatmap sequential ramp: dark top levels identical, light low levels faint (serious)

- **WCAG:** 1.4.11 for the legend swatches. Cells print their values, so 1.4.1 is met, but the color encoding is misleading.
- **Evidence (`contrast-tokens.json`):**
  - **Dark theme, level 4 vs level 5:** accent 1.14, accent-soft 1.23, loss 1.15, warn 1.05, gain 1.04, neutral 1.08. `--ch-seq-5` mixes the base with `#000`, which on a dark surface goes back toward the surface. Accent-soft and neutral are non-monotonic: seq-4 2.62/2.61 vs surface, seq-5 2.14/2.41. In `where-it-leaks--dark`, the "$7K to 13K" and "$13K and up" swatches can't be told apart.
  - **Light theme vs surface:** seq-1 1.07–1.18, seq-2 1.18–1.51, seq-3 1.30–2.01, seq-4 1.42–2.55. Only seq-5 reaches at least 3:1. Neighboring steps differ by 1.09–1.34.
  - Cell text contrast passes for every tone × theme × level (4.92–17.0).
- **Fix (`theme/theme.css`):**
  - In both dark blocks, define `--ch-seq-5: var(--ch-seq-base, var(--ch-loss))` (the pure base) and `--ch-seq-ink-strong: var(--ch-surface)`. Computed: level 5 is 4.53–10.44:1 vs surface, a 1.74–2.10 step from level 4, and #121215 text on it is 4.53–10.44:1.
  - Light: add a 1px `inset 0 0 0 1px color-mix(in srgb, var(--ch-seq-base) 45%, var(--ch-surface))` border on levels 1–2 cells and swatches so they read as shapes.
  - `theme.test.ts` asserts `--ch-seq-ink-strong` is `#fff` and must be updated.
- **Public API:** no. Token values change.

### A11Y-10: Hover tooltips can't be dismissed and NearestPointer tooltips can't be hovered (minor)

- **WCAG:** 1.4.13 Content on Hover or Focus.
- **Evidence (`hover-escape.mjs`):** hover bar 4 in `last-12-weeks--light`, then press Escape: the tooltip is still there (focus on `BODY`), because `onKeyDown` only lives on the figure. In `dallas-installs` (NearestPointer), moving the pointer onto the 208 × 30 tooltip makes it disappear (`.ch-overlay { pointer-events: none }` plus the nearest-point radius).
- **Fix (`react/Chart.tsx`):** while `interaction.source === 'pointer'` and a point is active, attach a `document` `keydown` listener for Escape that calls `setActive(null, 'pointer')`. In `NearestPointer.tsx`, ignore `pointermove` events whose target is inside the tooltip, or keep the active point while the pointer is within the tooltip box.
- **Public API:** no.

### A11Y-11: Data table fallback quality (minor)

- **WCAG:** 1.3.1.
- **Evidence (`semantics.json`):**
  - Headers come from accessor keys through `headerOf` (`charts/shared.ts`): "week", "margin" (BarChart), "name", "amount" (RankedBars, drill-columns), "job" (StripPlot), "Item"/"Group" (DotHistogram).
  - Empty cells: BridgeChart row 1 "Change" is `""`, the waterfall "Target" row "Change" is `""`, and LineChart "Apr" has three empty forecast cells.
  - The first column uses `<td>`, not `<th scope="row">` (`DataTable.tsx`).
  - High-level charts only take `dataTable?: boolean`, so captions and headers can't be fixed.
  - The `LastTwelveWeeks` story (low-level Chart) has no table.
- **Fix:**
  - `DataTable.tsx`: render column 0 as `<th scope="row">`, and render `''` as `<span aria-hidden="true">–</span><span class="ch-sr-only">No data</span>`, like Heatmap's `NoData`.
  - Charts: accept `dataTable?: boolean | { caption?: string; headers?: Partial<Record<string, string>> }`.
  - `shared.ts` `headerOf`: sentence-case the key ("Week", "Margin").
- **Public API:** additive (`dataTable` widened to an object). Snapshot changes.

### A11Y-12: Announcements lack context, and focus alone shows nothing (minor)

- **WCAG:** advisory for 2.4.6 and 3.3.2. This is also a gap against spec §5 ("Focus shows the same tooltip as hover").
- **Evidence (`keyboard.json`):**
  - Focusing a chart shows no tooltip and announces nothing until an arrow key is pressed.
  - Announcements carry no series or position: BarChart says "Jul 6, 37.5%", with no "Margin" and no "1 of 12". DotHistogram says "#5600, 3.1%", with no group ("Critical"), although the tooltip shows "Brookside Apartments".
  - ArrowDown in DotHistogram doesn't move (#5601 → #5601), and nothing tells the user a boundary was reached.
- **Fix (`react/Chart.tsx`):** on keyboard `focus` with no active point, either activate the first point or announce the hint (see A11Y-1). Build the announcement as `${label}, ${index + 1} of ${points.length}`, and let the high-level charts add the series name (`ariaLabel` defaults in each chart).
- **Public API:** no.

### A11Y-13: Hatch gaps, fades, soft dots and dimmed marks are faint (minor)

- **WCAG:** 1.4.11.
- **Evidence:** against the surface, light / dark:
  - hatch tint between stripes: 1.08–1.20 / 1.22–1.52
  - hatch-fade inner end (mask 0.3): 1.19–1.51 / 1.46–1.99
  - soft dots (45%): 1.30–1.87 / 1.87–3.00
  - dimmed marks (`--ch-dim-opacity` 0.35): 1.23–1.63 / 1.58–2.28
  - bands (18%): 1.11–1.27 / 1.22–1.45

  Hatched bars have no outline, so only the 1.5px stripes mark the edge. Dimmed and faded marks are still data, e.g. the bridge "Profit left" fade and inactive bars while one is active.
- **Fix (`theme/theme.css`, `PatternDefs.tsx`):** add a 1px stroke in the tone on hatched bars (`[data-ch-fill^="hatch"] { stroke: var(--ch-swatch-color) }` after setting `--ch-swatch-color` on the rect). Raise `--ch-dim-opacity` to about 0.55 and the fade mask end to 0.5, or add an outline.
- **Public API:** no.

### A11Y-14: Grid lines, tracks and the empty-cell border are faint (minor)

- **WCAG:** 1.4.11, for the parts that carry meaning: the track shows the full scale.
- **Evidence:** `--ch-grid` vs surface 1.21 (light) / 1.31 (dark). Bar, meter and inline-bar track (grid at 55%) 1.11 / 1.14. Heatmap level-0 border 1.21 / 1.31.
- **Fix:** keep grid lines as decoration, but give `.ch-meter-track`/`.ch-inline-bar` a 1px `--ch-ink-muted` border at 30% (or reach 3:1), and draw the level-0 border in `color-mix(var(--ch-ink-muted) 60%, var(--ch-surface))`.
- **Public API:** no.

### A11Y-15: Heatmap grid navigation gaps (minor)

- **WCAG:** 2.1.1 (APG data-grid conventions).
- **Evidence:**
  - Row totals (`.ch-heatmap-total`, role gridcell) and column headers aren't focusable, so arrow navigation never reaches them.
  - `Control+End` behaves like End and stays in the row ($3.6K). PageDown does nothing.
  - Escape and Enter work. With no `onSelect`, Enter is silently a no-op.
- **Fix (`Heatmap.tsx` `onKeyDown`):** add Ctrl+Home/Ctrl+End (first and last cell of the grid). Let the arrow keys reach the total cells with `tabIndex={-1}`, or use `aria-readonly`, and document the behavior.
- **Public API:** no.

### A11Y-16: `<Chart>` is always a tab stop (minor)

- **WCAG:** advisory for 2.4.3.
- **Evidence:** `Chart.tsx` sets `tabIndex={isEmpty ? undefined : 0}` whether or not any marks have registered points. A chart with only `Line`/`Area`/`Grid` and no interactive marks becomes a focusable stop where nothing happens. Found in code review; every story has points.
- **Fix:** `tabIndex={!isEmpty && interaction.points.length > 0 ? 0 : undefined}`. The first render after SSR has no points, so to keep server and client output identical, register synchronously or keep `0` and drop it after mount.
- **Public API:** no.

### A11Y-17: LineChart legend doesn't show the dot styles (minor)

- **WCAG:** 1.4.1 Use of Color.
- **Evidence:** in `margin-outlook`, "Current path" and "With your changes" are both dashed. They differ by color (accent / gain) and by hollow vs solid dots, but the legend swatches (`shape="line"`, `dashed`) show only color and dash. In light, gain is 2.93:1 (A11Y-3).
- **Fix:** add a `marker?: 'dot' | 'ring'` option to `LegendItem` (`ui/Legend.tsx`), or change the dash pattern per series (`LineChart.tsx`).
- **Public API:** additive (`LegendItem.marker`).

### A11Y-18: CI misses what this audit found (minor, process)

- **Evidence:**
  - `apps/storybook/e2e/stories.spec.ts` runs axe with `['wcag2a','wcag2aa','wcag21a','wcag21aa']` only, so `empty-table-header` (best-practice) and the wcag22aa rules never run.
  - axe returns every SVG `text` node as `color-contrast` "incomplete" (`bgOverlap` from the transparent hit layers). That makes the CI's "axe-clean" claim blind to A11Y-2.
  - There are no forced-colors or 320 px checks.
- **Fix:**
  - Add `'wcag22aa','best-practice'` to `withTags`.
  - Port `rendered-contrast.mjs` (pixel contrast for SVG text), the forced-colors probe and the 320 px overlap check into `apps/storybook/e2e` as extra specs.
  - In `theme.test.ts`, add 3:1 tone-vs-surface and level-step checks.
- **Public API:** no.

---

## Method and evidence files

All paths below are relative to `docs/superpowers/specs/assets/0.6-a11y-audit/`.

| Step | Script | Output |
|---|---|---|
| axe on every story × `globals=theme:light|dark` (stories with `parameters.theme` keep their own theme; the effective theme was read from `.sb-canvas[data-ch-theme]`) | `axe.mjs` | `axe-results.json` (violations plus incomplete nodes) |
| Token contrast resolved in the browser (`color-mix` included), every tone × theme × level | `contrast-tokens.mjs`, `suggest.mjs` | `contrast-tokens.json` |
| Rendered text contrast. fg = computed `fill`/`color`; bg = the screenshot pixels under each text box after all text is made transparent; median ratio. Rest state plus focused state (tooltips, highlights) | `rendered-contrast.mjs`, `analyze-contrast.mjs` | `rendered-contrast.json` |
| Keyboard: Tab walk, then Arrow/Home/End/Enter/Escape/Tab per chart; heatmap roving tabindex, Ctrl+End, PageDown, tab out and back | `keyboard.mjs` | `keyboard.json` |
| Hover tooltip Escape and hoverability | `hover-escape.mjs` | console |
| Reduced motion (`getAnimations()` counts) and forced colors (`forcedColors:'active'`, light and dark scheme; computed styles plus screenshots) | `motion-forced.mjs` | `motion-forced.json`, `shots/forced-*.png` |
| Accessibility tree: Playwright `ariaSnapshot` and Chrome CDP `Accessibility.getFullAXTree` | `semantics.mjs`, `axtree.mjs` | `aria-snapshots.txt`, `semantics.json`, `axtree-*.txt` |
| Reflow and zoom: 1280 px, 640 px @2× (200%), 320 px; horizontal scroll, off-screen text, SVG label overlaps, clipped HTML text | `reflow.mjs` | `reflow.json`, `shots/reflow-*.png` |
| Text spacing (1.4.12 styles injected) | `text-spacing.mjs` | `text-spacing.json` |

**Limits:**
- No real screen reader was driven, so A11Y-1, A11Y-7 and A11Y-12 need manual NVDA, JAWS and VoiceOver checks.
- Forced colors were emulated in Chromium only. Windows Edge with a real high-contrast theme should confirm.
- Text-only resize wasn't testable in Chromium. All library font sizes are in `px`, so a user's default font-size setting has no effect; browser zoom works.

## Versions and how to rerun

- `playwright` **1.64.0** (same as the repo's `@playwright/test` 1.64.0), Chromium **156.0.8078.4** headless shell (`chromium_headless_shell-1248`, already in `~/Library/Caches/ms-playwright`)
- `@axe-core/playwright` **4.13.0** (matches the repo), `axe-core` **4.13.0**
- `pngjs` **7.0.0** (for decoding pixels)
- Node: the system Node used by the scratch project (ESM `.mjs`)

```sh
cd docs/superpowers/specs/assets/0.6-a11y-audit
npm install                      # package.json pins playwright 1.64.0, @axe-core/playwright 4.13.0, pngjs 7.0.0
# Storybook must be serving on http://localhost:6006 (BASE in common.mjs)
node axe.mjs                     # ~1 min, writes axe-results.json
node contrast-tokens.mjs         # token contrast matrix
node rendered-contrast.mjs && node analyze-contrast.mjs   # ~8–10 min, pixel text contrast
node keyboard.mjs                # keyboard.json
node hover-escape.mjs
node motion-forced.mjs           # motion-forced.json + shots/forced-*.png
node semantics.mjs && node axtree.mjs reference-where-it-leaks--light reference-last-12-weeks--light
node reflow.mjs                  # reflow.json + shots/reflow-*.png
node text-spacing.mjs
```
