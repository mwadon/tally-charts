---
'tally-charts': major
---

New default colors. Actual values are navy, loss is coral and gain is blue, in both themes. The
roles of the tokens are the same; `--ch-warn`, `--ch-neutral`, the ink and the surfaces are
unchanged. Loss and gain no longer depend on telling red from green.

| Token | Light, was | Light, now | Dark, was | Dark, now |
|---|---|---|---|---|
| `--ch-accent` | `#2f6bf0` | `#24356b` | `#4d86ff` | `#7f9be6` |
| `--ch-accent-soft` | `#9dbcf6` | `#a9b6de` | `#5a7cc4` | `#6f80b4` |
| `--ch-loss` | `#e5368d` | `#e8505b` | `#ff4fa0` | `#ff6b74` |
| `--ch-gain` | `#22a363` | `#3a93b8` | `#3ccf86` | `#5cc0e6` |

The `vivid` palette's `--ch-gain` is `#4fa3c7` (was `#23a866`). The shares of the sequential
levels are tuned to the new colors. No props change.

Migration: nothing to do for the new look. To keep the old colors, set the tokens after the theme
import.

Before (0.9 colors, no CSS of your own):

```css
@import 'tally-charts/theme.css';
```

After (the same colors in 1.0):

```css
@import 'tally-charts/theme.css';

:root,
[data-ch-theme="light"] {
  --ch-accent: #2f6bf0;
  --ch-accent-soft: #9dbcf6;
  --ch-loss: #e5368d;
  --ch-gain: #22a363;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-ch-theme="light"]) {
    --ch-accent: #4d86ff;
    --ch-accent-soft: #5a7cc4;
    --ch-loss: #ff4fa0;
    --ch-gain: #3ccf86;
  }
}

[data-ch-theme="dark"] {
  --ch-accent: #4d86ff;
  --ch-accent-soft: #5a7cc4;
  --ch-loss: #ff4fa0;
  --ch-gain: #3ccf86;
}
```

See the migration guide: https://tally-charts-docs.vercel.app/docs/migration-1-0#default-colors
