'use client'

import { useState } from 'react'
import { RunwayChart, type RunwayForecastInput, runwayForecast } from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'runway-chart/gpu-budgets',
  title: 'GPU hours per team, with the highlighted row controlled from outside',
  rscSafe: false,
} satisfies ExampleMeta

const now = '2026-11-02T10:00:00Z'
const domain = ['2026-11-02T00:00:00Z', '2026-11-09T00:00:00Z'] as const

type Window = Omit<RunwayForecastInput, 'now'>

const teams: { id: string; label: string; sublabel: string; window: Window }[] = [
  {
    id: 'vision',
    label: 'Vision',
    sublabel: 'Research',
    window: { used: 0.55, windowStart: '2026-11-01T00:00Z', resetAt: '2026-11-08T00:00Z' },
  },
  {
    id: 'speech',
    label: 'Speech',
    sublabel: 'Research',
    window: { used: 0.2, windowStart: '2026-10-30T00:00Z', resetAt: '2026-11-06T00:00Z' },
  },
  {
    id: 'ranking',
    label: 'Ranking',
    sublabel: 'Product',
    window: { used: 0.8, windowStart: '2026-10-28T12:00Z', resetAt: '2026-11-04T12:00Z' },
  },
  {
    id: 'ads',
    label: 'Ads',
    sublabel: 'Product',
    window: { used: 0.35, windowStart: '2026-10-29T00:00Z', resetAt: '2026-11-05T00:00Z' },
  },
]

const rows = teams.map(({ window, ...team }) => ({
  ...team,
  ...runwayForecast({ ...window, now }),
}))

// Fixed zone, so the server and the browser print the same text.
const when = (date: Date) =>
  date.toLocaleString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })

const summary = (id: string | null) => {
  const row = rows.find((r) => r.id === id)
  if (!row) return 'Active: none'
  const out = row.runsOutAt && row.runsOutAt < row.resetAt
  return `Active: ${row.label}, ${out ? `runs out ${when(row.runsOutAt as Date)}` : `${Math.round(row.usedAtReset * 100)}% at reset`}`
}

// 'use client': the highlighted row and the selected row are state, and the callbacks are functions.
export default function GpuBudgets() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const move = (step: number) => {
    const at = rows.findIndex((r) => r.id === activeId)
    const next = at < 0 ? (step > 0 ? 0 : rows.length - 1) : (at + step + rows.length) % rows.length
    setActiveId(rows[next]?.id ?? null)
  }
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" onClick={() => move(-1)}>
          Previous team
        </button>
        <button type="button" onClick={() => move(1)}>
          Next team
        </button>
        <button type="button" onClick={() => setActiveId(null)}>
          Clear
        </button>
        <p aria-live="polite" style={{ margin: 0 }}>
          {summary(activeId)}
        </p>
      </div>
      <RunwayChart
        title={meta.title}
        description="Vision and Ranking run out on Tuesday, before their budgets reset; Speech and Ads last."
        rows={rows}
        domain={domain}
        now={now}
        cell="6h"
        labelWidth={140}
        activeId={activeId}
        onActiveChange={setActiveId}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />
    </div>
  )
}
