import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunwayChart, type RunwayChartProps, type RunwayRow } from './RunwayChart'

const H = 36e5
const D = 24 * H
const now = Date.UTC(2026, 9, 15, 2)
const domain = [Date.UTC(2026, 9, 15), Date.UTC(2026, 9, 22)] as const

const rows: RunwayRow[] = [
  {
    id: 'pro',
    label: 'Pro plan',
    projection: [
      { at: now, used: 0.85 },
      { at: now + 25 * H, used: 1 },
    ],
    runsOutAt: now + 25 * H,
    resetAt: now + 33 * H,
  },
  {
    id: 'team',
    label: 'Team seat',
    projection: [
      { at: now, used: 0.2 },
      { at: now + 3 * D, used: 0.53 },
    ],
    resetAt: now + 3 * D,
  },
  { id: 'starter', label: 'Starter', disconnected: true, status: 'Reconnect to forecast' },
]

function renderRunway(props: Partial<RunwayChartProps> = {}) {
  return render(
    <RunwayChart
      rows={rows}
      domain={domain}
      now={now}
      title="Runway"
      initialWidth={900}
      {...props}
    />,
  )
}

const part = (root: ParentNode, name: string) =>
  [...root.querySelectorAll(`[data-ch-part="${name}"]`)] as HTMLElement[]

describe('<RunwayChart>', () => {
  afterEach(() => vi.restoreAllMocks())

  it('draws 28 six-hour cells per row with their states', () => {
    const { container } = renderRunway()
    const strips = part(container, 'runway-strip')
    expect(strips).toHaveLength(3)
    const states = (strip: Element) =>
      [...strip.querySelectorAll('[data-ch-part="runway-cell"]')].map((c) =>
        c.getAttribute('data-ch-state'),
      )
    const pro = states(strips[0] as Element)
    expect(pro).toHaveLength(28)
    expect(pro.slice(0, 4)).toEqual(['level', 'level', 'level', 'level'])
    expect(pro[4]).toBe('runs-out')
    expect(pro[5]).toBe('locked')
    expect(pro.at(-1)).toBe('empty')
    expect(new Set(states(strips[2] as Element))).toEqual(new Set(['empty']))
  })

  it('paints levels with the sequential level and locked cells with the loss hatch', () => {
    const { container } = renderRunway()
    const level = container.querySelector('[data-ch-state="level"]')
    expect(level?.getAttribute('data-ch-level')).toMatch(/^[1-5]$/)
    const locked = container.querySelector('[data-ch-state="locked"]') as SVGElement
    expect(locked.style.fill).toMatch(/^url\("?#ch-.*-hatch-loss"?\)$/)
    expect(container.querySelector('pattern[id$="-hatch-loss"]')).not.toBeNull()
  })

  it('marks now, the reset and the runs-out dot at their exact times', () => {
    const { container } = renderRunway()
    const [proStrip] = part(container, 'runway-strip')
    const width = Number(proStrip?.getAttribute('width'))
    const x = (t: number) => ((t - domain[0]) / (domain[1] - domain[0])) * width
    const dot = proStrip?.querySelector('[data-ch-part="runway-dot"]')
    expect(Number(dot?.getAttribute('cx'))).toBeCloseTo(x(now + 25 * H), 3)
    const reset = proStrip?.querySelector('[data-ch-part="runway-reset"]')
    expect(Number(reset?.getAttribute('x')) + 1).toBeCloseTo(x(now + 33 * H), 3)
    expect(proStrip?.querySelector('[data-ch-part="runway-reset-label"]')?.textContent).toBe(
      'reset',
    )
    expect(part(container, 'runway-now')).toHaveLength(4) // axis + three rows
  })

  it('omits the reset label when it would not fit before the end', () => {
    const late = [{ ...rows[1], id: 'late', resetAt: domain[1] - H } as RunwayRow]
    const { container } = renderRunway({ rows: late })
    expect(container.querySelector('[data-ch-part="runway-reset"]')).not.toBeNull()
    expect(container.querySelector('[data-ch-part="runway-reset-label"]')).toBeNull()
  })

  it('draws no reset tick at the domain end itself', () => {
    const edge = [{ ...rows[1], id: 'edge', resetAt: domain[1] } as RunwayRow]
    const { container } = renderRunway({ rows: edge })
    expect(container.querySelector('[data-ch-part="runway-reset"]')).toBeNull()
    expect(container.querySelector('[data-ch-part="runway-status"]')?.textContent).not.toContain(
      '→',
    )
  })

  it('writes the default status, a row status, and a status prop', () => {
    renderRunway({ status: (row) => (row.id === 'team' ? 'Custom' : undefined) })
    const statuses = part(document.body, 'runway-status').map((el) => el.textContent)
    expect(statuses).toEqual([
      'Runs out Fri 03:00 Resets Fri 11:00',
      'Custom',
      'Reconnect to forecast',
    ])
  })

  it('labels the axis with day names and Now', () => {
    const { container } = renderRunway()
    const axis = part(container, 'runway-axis')[0] as HTMLElement
    const labels = [...axis.querySelectorAll('[data-ch-part="axis-label"]')].map(
      (t) => t.textContent,
    )
    expect(labels).toEqual(['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'])
    expect(axis.querySelector('[data-ch-part="runway-now-label"]')?.textContent).toBe('Now')
  })

  it('shows the legend from the breaks, and hides it on request', () => {
    const { container, rerender } = renderRunway()
    expect(container.querySelector('[data-ch-part="legend"]')?.textContent).toContain(
      'under 25, 50, 75, 100%',
    )
    rerender(<RunwayChart rows={rows} domain={domain} now={now} title="Runway" legend={false} />)
    expect(container.querySelector('[data-ch-part="legend"]')).toBeNull()
  })

  it('mutes a disconnected row and sets the sequential tone', () => {
    const { container } = renderRunway({ tone: 'accent' })
    expect(part(container, 'runway-row')[2]?.getAttribute('data-ch-muted')).toBe('true')
    expect(part(container, 'runway')[0]?.getAttribute('data-ch-seq-tone')).toBe('accent')
    const { container: plain } = renderRunway()
    expect(part(plain, 'runway')[0]?.getAttribute('data-ch-seq-tone')).toBe('neutral')
  })

  it('stacked at 320 px: switches layout and keeps every cell at least 1 px apart', () => {
    const { container } = renderRunway({ initialWidth: 320 })
    expect(part(container, 'runway')[0]?.getAttribute('data-ch-layout')).toBe('stacked')
    const cells = [
      ...(part(container, 'runway-strip')[0] as HTMLElement).querySelectorAll(
        '[data-ch-part="runway-cell"]',
      ),
    ]
    for (let i = 1; i < cells.length; i++) {
      const prev = cells[i - 1] as Element
      const end = Number(prev.getAttribute('x')) + Number(prev.getAttribute('width'))
      expect(Number(cells[i]?.getAttribute('x')) - end).toBeGreaterThanOrEqual(1 - 1e-9)
    }
    expect(
      renderRunway({ layout: 'columns', initialWidth: 320 }).container.querySelector(
        '[data-ch-layout="columns"]',
      ),
    ).not.toBeNull()
  })

  it('renders empty for no rows or a bad domain, with warnings', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(renderRunway({ rows: [] }).container.textContent).toContain('No data')
    expect(renderRunway({ domain: [domain[1], domain[0]] }).container.textContent).toContain(
      'No data',
    )
    expect(warn.mock.calls.some(([m]) => String(m).includes('RunwayChart needs a domain'))).toBe(
      true,
    )
  })

  it('warns about a bad cell, too many cells, bad breaks, duplicate ids and a missing title', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderRunway({ cell: 'often', title: undefined })
    renderRunway({ cell: 60_000 })
    renderRunway({ breaks: [0.5, 0.25, Number.NaN] })
    renderRunway({ rows: [rows[0] as RunwayRow, rows[0] as RunwayRow] })
    const text = warn.mock.calls.map(([m]) => String(m)).join('\n')
    for (const phrase of [
      'RunwayChart `cell`',
      'RunwayChart shows at most 200 cells',
      'RunwayChart `breaks`',
      'RunwayChart has a duplicate row id',
      'RunwayChart has no `title`',
    ]) {
      expect(text).toContain(phrase)
    }
  })
})
