import type { ReactNode } from 'react'
import { type RunwayForecastInput, type RunwayRow, runwayForecast } from 'tally-charts'

// Shared by the RunwayChart stories and the usage runway reference (docs/reference/08-usage-runway.png).
// Every account, plan and number here is fictional.

export const now = '2026-10-15T02:00:00Z'
export const domain = ['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z'] as const
export const cell = '6h'

const svg = (children: ReactNode) => (
  <svg
    aria-hidden="true"
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
)

const ICONS = [
  // Asterisk
  svg(<path d="M10 2.5v15M3.5 6.25l13 7.5M3.5 13.75l13-7.5" />),
  // Ring
  svg(<circle cx={10} cy={10} r={6.5} />),
  // Cube
  svg(<path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5zM3.5 6.25L10 10l6.5-3.75M10 10v7.5" />),
  // Chevron
  svg(<path d="M6 4l7 6-7 6" />),
  // Smiley
  svg(
    <>
      <circle cx={10} cy={10} r={7} />
      <path d="M7 12c1.6 1.6 4.4 1.6 6 0M7.5 8h.01M12.5 8h.01" />
    </>,
  ),
]

type Window = Omit<RunwayForecastInput, 'now'>

/** The usage windows behind each forecast row, for the detail panel. */
export const windows: Record<string, Window> = {
  pro: { used: 0.85, windowStart: '2026-10-09T11:22Z', resetAt: '2026-10-16T11:22Z' },
  team: { used: 0.3, windowStart: '2026-10-14T09:21Z', resetAt: '2026-10-21T09:21Z' },
  'team-max': { used: 0.45, windowStart: '2026-10-12T00:29Z', resetAt: '2026-10-19T00:29Z' },
  'editor-2': { used: 0.4, windowStart: '2026-10-10T00:00Z', resetAt: '2026-11-09T00:00Z' },
  research: { used: 0.48, windowStart: '2026-10-09T20:13Z', resetAt: '2026-10-16T20:13Z' },
  assistant: { used: 0.25, windowStart: '2026-10-02T00:00Z', resetAt: '2026-11-01T00:00Z' },
  code: { used: 0.12, windowStart: '2026-10-13T09:55Z', resetAt: '2026-10-20T09:55Z' },
  studio: { used: 0.22, windowStart: '2026-10-11T07:13Z', resetAt: '2026-10-18T07:13Z' },
  editor: { used: 0.2, windowStart: '2026-10-11T12:46Z', resetAt: '2026-10-18T12:46Z' },
  'code-team': { used: 0.24, windowStart: '2026-10-09T06:28Z', resetAt: '2026-10-16T06:28Z' },
}

const accounts: { id: string; label: string; sublabel: string }[] = [
  { id: 'pro', label: 'Pro plan', sublabel: 'Side project' },
  { id: 'team', label: 'Team seat', sublabel: 'Work' },
  { id: 'team-max', label: 'Team seat Max', sublabel: 'Work' },
  { id: 'editor-2', label: 'Editor (personal 2)', sublabel: 'Personal' },
  { id: 'research', label: 'Research plan', sublabel: 'Lab' },
  { id: 'assistant', label: 'Assistant seat', sublabel: 'Work' },
  { id: 'code', label: 'Code plan', sublabel: 'Work' },
  { id: 'studio', label: 'Studio Max', sublabel: 'Personal' },
  { id: 'editor', label: 'Editor (personal)', sublabel: 'Personal' },
  { id: 'code-team', label: 'Code team', sublabel: 'Work' },
  { id: 'starter', label: 'Starter', sublabel: 'Trial' },
]

export type UsageRow = RunwayRow & Partial<ReturnType<typeof runwayForecast>>

export const rows: UsageRow[] = accounts.map((account, i) => {
  const icon = ICONS[i % ICONS.length]
  const input = windows[account.id]
  if (!input) {
    return { ...account, icon, disconnected: true, status: 'Reconnect to forecast' }
  }
  return { ...account, icon, ...runwayForecast({ ...input, now }) }
})

/** Rows that run out before their window resets. */
export const runOuts = rows.filter(
  (r) => r.runsOutAt && r.resetAt && +new Date(r.runsOutAt) < +new Date(r.resetAt),
)
