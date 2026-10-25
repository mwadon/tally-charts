'use client'

import { type ReactNode, useMemo, useState } from 'react'
import {
  Area,
  BarChart,
  Dots,
  Legend,
  LineChart,
  Region,
  RunwayChart,
  type RunwayForecastInput,
  type RunwayRow,
  runwayForecast,
  Stat,
  type Tone,
  useChart,
  useFormat,
} from 'tally-charts'
import type { ExampleMeta } from '../types'

export const meta = {
  id: 'reference/08-usage-runway',
  title: 'Usage runway: which accounts run out before reset',
  rscSafe: false,
} satisfies ExampleMeta

// Every account, plan and number here is fictional. The runway on the left and the selected
// account's detail on the right are built from the public API only.

// A fixed "now", so the example renders the same every time.
const now = '2026-10-15T02:00:00Z'
const domain = ['2026-10-15T00:00:00Z', '2026-10-22T00:00:00Z'] as const
const cell = '6h'

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
const windows: Record<string, Window> = {
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

type UsageRow = RunwayRow & Partial<ReturnType<typeof runwayForecast>>

const rows: UsageRow[] = accounts.map((account, i) => {
  const icon = ICONS[i % ICONS.length]
  const input = windows[account.id]
  if (!input) {
    return { ...account, icon, disconnected: true, status: 'Reconnect to forecast' }
  }
  return { ...account, icon, ...runwayForecast({ ...input, now }) }
})

/** Rows that run out before their window resets. */
const runOuts = rows.filter(
  (r) => r.runsOutAt && r.resetAt && +new Date(r.runsOutAt) < +new Date(r.resetAt),
)

const HOUR = 36e5
const DAY = 24 * HOUR
const NOW = Date.parse(now)

const ms = (t: string | number | Date) => +new Date(t)

function useDates() {
  const { date } = useFormat()
  return useMemo(
    () => ({
      // "Fri 03:24", like the runway's own status lines.
      weekdayTime: date(
        { weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
        { zone: 'utc' },
      ),
      dayTime: date(
        { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
        { zone: 'utc' },
      ),
    }),
    [date],
  )
}

const first = [...runOuts].sort((a, b) => ms(a.runsOutAt as Date) - ms(b.runsOutAt as Date))[0]
const lockedHours = (r: UsageRow) => Math.round((r.lockedMs ?? 0) / HOUR)

interface BurnPoint {
  at: number
  used: number | null
  pace: number | null
  even: number
}

/** Used so far (a deterministic staircase), the projection and the even pace, in percent. */
function burnUp(row: UsageRow): BurnPoint[] {
  const input = windows[row.id]
  if (!input) return []
  const start = ms(input.windowStart)
  const reset = ms(input.resetAt)
  const even = (t: number) => ((t - start) / (reset - start)) * 100
  const points = new Map<number, BurnPoint>()
  const at = (t: number) => {
    let p = points.get(t)
    if (!p) {
      p = { at: t, used: null, pace: null, even: even(t) }
      points.set(t, p)
    }
    return p
  }
  const n = Math.floor((NOW - start) / (6 * HOUR))
  let prev = 0
  for (let i = 0; i <= n; i++) {
    const raw = input.used * (i / n + 0.03 * Math.sin(i * 1.7))
    prev = Math.min(input.used, Math.max(prev, raw))
    at(start + i * 6 * HOUR).used = prev * 100
  }
  at(NOW).used = input.used * 100
  for (const p of row.projection ?? []) at(ms(p.at)).pace = p.used * 100
  at(reset)
  return [...points.values()].sort((a, b) => a.at - b.at)
}

/** The runs-out moment on the burn-up: a loss dot at (runsOutAt, 100%). */
function RunsOutDot({ at, label }: { at: number; label: string }) {
  const { x, y } = useChart()
  if (x.kind !== 'time' || y.kind !== 'linear') return null
  return (
    <Dots
      radius={5}
      interactive={false}
      dots={[
        {
          key: 'runs-out',
          id: 'runs-out',
          datum: null,
          cx: x.scale(at),
          cy: y.scale(100),
          tone: 'loss',
          label,
        },
      ]}
    />
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Percentage points used on each of the last seven days, varying around the row's pace. */
function recentPace(row: UsageRow, allowed: number) {
  const pace = row.paceRatio ?? 0
  const seed = row.id.length
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(NOW - (6 - i) * DAY)
    const wobble = 1 + 0.35 * Math.sin(i * 2.3 + seed)
    return {
      day: i === 6 ? 'Today' : (WEEKDAYS[day.getUTCDay()] as string),
      value: Math.round(allowed * pace * wobble * 10) / 10,
    }
  })
}

function Detail({ row }: { row: UsageRow }) {
  const dates = useDates()
  const input = windows[row.id]
  if (!input || row.disconnected) {
    return (
      <section className="ref-runway-detail" aria-label={`${row.label} detail`}>
        <header className="ref-runway-detail-head">
          <span className="ref-runway-detail-icon">{row.icon}</span>
          <div>
            <h3 className="ref-runway-detail-title">{row.label}</h3>
            <span className="ref-card-meta">{row.sublabel}</span>
          </div>
        </header>
        <p className="ref-card-text">Reconnect this account to forecast its usage.</p>
      </section>
    )
  }
  const start = ms(input.windowStart)
  const reset = ms(input.resetAt)
  const runsOut = row.runsOutAt && ms(row.runsOutAt) < reset ? ms(row.runsOutAt) : undefined
  const windowDays = (reset - start) / DAY
  const allowed = Math.round((100 / windowDays) * 10) / 10
  const days = recentPace(row, allowed)
  const burn = burnUp(row)
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <section className="ref-runway-detail" aria-label={`${row.label} detail`}>
      <header className="ref-runway-detail-head">
        <span className="ref-runway-detail-icon">{row.icon}</span>
        <div>
          <h3 className="ref-runway-detail-title">{row.label}</h3>
          <span className="ref-card-meta">{row.sublabel}</span>
        </div>
      </header>
      <p className="ref-runway-detail-line">
        Used {pct(input.used)} in {pct(row.elapsed ?? 0)} of the window
      </p>
      <LineChart
        title={`${row.label} usage this window`}
        description={`Used ${pct(input.used)} so far; ${
          runsOut
            ? `runs out ${dates.weekdayTime(runsOut)}`
            : `about ${pct(row.usedAtReset ?? 0)} at reset`
        }.`}
        data={burn}
        x={{ type: 'time', field: 'at', domain: [start, reset] }}
        xAxis="ends"
        xAxisFormat={{ month: 'short', day: 'numeric' }}
        series={[
          { id: 'used', label: 'Used', value: 'used' },
          { id: 'pace', label: 'Current pace', value: 'pace', style: 'forecast' },
          { id: 'even', label: 'Even pace', value: 'even', style: 'scenario', tone: 'neutral' },
        ]}
        domain={[0, 100]}
        yAxis={3}
        yAxisFormat={(v) => `${v}%`}
        format={{ preset: 'percent', digits: 0 }}
        target={{ value: 100, label: '100%' }}
        radius={0}
        height={220}
        chartId={`burn-${row.id}`}
      >
        {/* The used share so far, shaded; children draw over the lines, so the fade stays light. */}
        <Area data={burn.filter((p) => p.used !== null)} x="at" y={(p) => p.used ?? 0} />
        {runsOut !== undefined ? (
          <>
            <Region from={runsOut} to={reset} tone="loss" fill="hatch" />
            <RunsOutDot at={runsOut} label={`Runs out ${dates.weekdayTime(runsOut)}`} />
          </>
        ) : null}
      </LineChart>
      <Legend
        className="ref-legend-gap"
        shape="line"
        items={[
          { label: 'Used', tone: 'accent' },
          { label: 'Current pace', tone: 'accent', dashed: true },
          { label: 'Even pace', tone: 'neutral', dashed: true },
          ...(runsOut !== undefined
            ? [
                { label: 'Runs out', tone: 'loss' as Tone, shape: 'dot' as const },
                {
                  label: 'Locked until reset',
                  tone: 'loss' as Tone,
                  fill: 'hatch' as const,
                  shape: 'bar' as const,
                },
              ]
            : []),
        ]}
      />
      <div className="ref-runway-stats">
        <Stat size="sm" label="Pace" value={`${(row.paceRatio ?? 0).toFixed(1)}x even`} />
        <Stat
          size="sm"
          label="Runs out"
          value={runsOut !== undefined ? dates.weekdayTime(runsOut) : '—'}
        />
        <Stat
          size="sm"
          label="Locked before reset"
          value={runsOut !== undefined ? `${lockedHours(row)} h` : '—'}
        />
      </div>
      <h4 className="ref-runway-detail-sub">
        Recent pace <span className="ref-card-meta">· pp used per day</span>
      </h4>
      <span className="ref-card-meta">Allowed: {allowed} pp a day</span>
      <BarChart
        title={`${row.label} percentage points used per day, last 7 days`}
        description={`Allowed ${allowed} pp a day; ${
          days.filter((d) => d.value > allowed).length
        } of the last 7 days were over.`}
        data={days}
        x="day"
        y="value"
        // The legend names the line; a label at its end would sit on the last bars.
        target={{ value: allowed }}
        tone={(d) => (d.value > allowed ? 'warn' : 'neutral')}
        fill="solid"
        axis="all"
        valueLabel="all"
        valueFormat={(v) => v.toFixed(0)}
        format={{ preset: 'number', digits: 1 }}
        height={180}
        chartId={`pace-${row.id}`}
      />
      <Legend
        items={[
          { label: 'Within allowance', tone: 'neutral' },
          { label: 'Over', tone: 'warn' },
          { label: 'Allowed per day', tone: 'neutral', shape: 'line', dashed: true },
        ]}
      />
    </section>
  )
}

// 'use client': the selected account and the view are state, and onSelect is a function.
export default function UsageRunway() {
  const dates = useDates()
  const [selected, setSelected] = useState<string>('pro')
  const [view, setView] = useState<'forecast' | 'table'>('forecast')
  const meta = first
    ? `${first.label} first, ${dates.weekdayTime(ms(first.runsOutAt as Date))}, then locked ${lockedHours(first)} h`
    : 'Every account lasts to its reset'
  const headline = `${runOuts.length} accounts run out before reset; ${meta}.`
  const row = rows.find((r) => r.id === selected) ?? rows[0]
  const when = (t: Date | undefined) => (t ? dates.dayTime(ms(t)) : '—')
  return (
    <div className="ref-dashboard">
      <article className="ref-card ref-card-wide">
        <header className="ref-card-header-row">
          <div>
            <h2 className="ref-card-title">{runOuts.length} accounts run out before reset</h2>
            <span className="ref-card-meta">{meta}</span>
          </div>
          <div className="ref-segmented">
            <button
              type="button"
              aria-pressed={view === 'forecast'}
              onClick={() => setView('forecast')}
            >
              Forecast
            </button>
            <button type="button" aria-pressed={view === 'table'} onClick={() => setView('table')}>
              Table
            </button>
          </div>
        </header>
        {view === 'forecast' ? (
          <div className="ref-runway-grid">
            <div>
              <RunwayChart
                rows={rows}
                domain={domain}
                now={now}
                cell={cell}
                labelWidth={176}
                title="Usage runway"
                description={headline}
                selectedId={selected}
                onSelect={setSelected}
                dataTable
              />
              <p className="ref-card-meta ref-runway-note">
                Assumes the pace holds. Select a row for detail.
              </p>
            </div>
            {row ? <Detail key={row.id} row={row} /> : null}
          </div>
        ) : (
          <div className="ref-table-scroll">
            <table className="ref-table">
              <caption className="ref-card-meta">Usage runway</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Runs out</th>
                  <th scope="col">Resets</th>
                  <th scope="col">Projected at reset</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const out = r.runsOutAt && r.resetAt && r.runsOutAt < r.resetAt
                  return (
                    <tr key={r.id}>
                      <th scope="row">{r.label}</th>
                      <td>{out ? when(r.runsOutAt) : '—'}</td>
                      <td>{when(r.resetAt)}</td>
                      <td>
                        {r.usedAtReset !== undefined && Number.isFinite(r.usedAtReset)
                          ? `${Math.round(r.usedAtReset * 100)}%`
                          : r.disconnected
                            ? 'Reconnect to forecast'
                            : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </div>
  )
}
