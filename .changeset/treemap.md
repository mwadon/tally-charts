---
'tally-charts': minor
---

New `Treemap`: the parts of a whole as tiles whose area is the value.

Data: give flat rows with `name` and `value`. `group` draws the rows of one group together under a header with the group's name and total (a group box lower than 48 px has no header; without `group` the tiles fill the whole box). Groups are ordered by total and tiles within a group by value, largest first, with ties in data order; the DOM and reading order follow it. Rows with a value of 0 are not drawn; rows with a missing, non-numeric or negative value are skipped with a development warning. With nothing to draw the chart shows `empty` (default "No data").

Shades: `shade` with `breaks` (as in `Heatmap`: 1 to 4 ascending edges, so 2 to 5 bins) shades each tile by a second measure on the sequential scale. A legend above the tiles names the bins (`legend`, default true). `binLabels` replaces the default bin labels only when it has exactly one label per bin; otherwise the default labels are used, with a development warning. `shadeFormat` formats the edges and `shadeLabel` names the measure. A row without a shade number is drawn at level 0, and without `shade` every tile has the middle level. `tone` sets the base tone, otherwise a `--ch-seq-base` on an ancestor, else the accent.

Size and text: `height` is the height of the tile box (default 480) and `initialWidth` the width assumed before the chart is measured (default 640). A tile shows its name when it is at least 64 px wide and 28 px high, and a second line "value · share" when it is at least 96 by 48 px; smaller tiles are drawn without text.

Interaction: on hover or focus a tile shows the library's tooltip pill with its name, value, share of the total ("22.4% of total") and shade (`tooltip`, default true; `false` turns it off, a function replaces its content). `activeId` and `onActiveChange` control the active tile, and `onSelect` is called on click, Enter and Space. Arrow keys move to the nearest tile in that direction, Home and End to the first and last, and Escape clears the active tile.

Accessibility: the tiles are a `listbox` of `option`s with one roving tab stop, each named by its name, value, share, shade and bin. There is no hidden data table.

Two new `ChartMessages` keys set the texts: `treemapName` ("Treemap", the name when there is no `title`) and `headerShade` ("Shade", the shade's name when `shade` is a function).

```tsx
<Treemap
  title="Revenue by service line"
  data={serviceLines}
  name="line"
  value="revenue"
  group="group"
  shade="margin"
  breaks={[10, 20, 30, 40]}
  shadeFormat={{ preset: 'percent', digits: 0 }}
/>
```
