---
'tally-charts': minor
---

`tally-charts/core` exports `createDateFormatter` and its types `DateFormatOptions`, `DateFormatSpec` and `DateFormatter`. It formats a single date (epoch ms) with a preset (`'day'`, `'month'`, `'quarter'`, `'year'`), `'auto'` or any `Intl.DateTimeFormatOptions`, and gives an empty string for an invalid date.

```ts
import { createDateFormatter } from 'tally-charts/core'

createDateFormatter('month', { locale: 'en-US' })(Date.UTC(2026, 0, 15)) // "Jan 2026"
```
