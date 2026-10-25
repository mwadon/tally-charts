---
'tally-charts': patch
---

Documentation only, no code change. The README has a Stability section, and `docs/stability.md`
says what semver covers from 1.0 (exports, `--ch-*` tokens, `data-ch-part`, `data-ch-*`
attributes, `theme.css`) and what it doesn't (`ch-*` classes, `--_ch-*` variables, DOM outside the
parts, the wording of the built-in English strings, size budgets). `docs/a11y.md` lists the hover
tooltip and lower-inclusive `breaks` among the known limits.

Not public API from 1.0: the wording of the built-in English strings (such as "No data" or the
keyboard hint) may change in a minor release until an i18n hook arrives, and the `--_ch-*`
variables (for example `--_ch-swatch-color`) may change or disappear in any release. Do not read or
set them; use the `--ch-*` tokens. Where you need the exact words, pass your own text, such as
`keyboardHint`, and in tests find a chart by its `title` and role, not by built-in text.

See the migration guide: https://tally-charts.vercel.app/docs/migration-1-0
