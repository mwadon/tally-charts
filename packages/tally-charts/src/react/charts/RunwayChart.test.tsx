import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

function renderLabelled(props: Partial<RunwayChartProps> = {}) {
  return render(
    <>
      <h2 id="ext">Runway by account</h2>
      <RunwayChart
        rows={rows}
        domain={domain}
        now={now}
        aria-labelledby="ext"
        initialWidth={900}
        {...props}
      />
    </>,
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

  it('measures the strip when rows arrive after an empty first render', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 600,
    } as DOMRect)
    const { container, rerender } = renderRunway({ rows: [] })
    expect(part(container, 'runway-strip')).toHaveLength(0)
    rerender(
      <RunwayChart rows={rows} domain={domain} now={now} title="Runway" initialWidth={900} />,
    )
    expect(part(container, 'runway-strip')[0]?.getAttribute('width')).toBe('600')
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

  it('takes the list name from the element aria-labelledby points at, without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderLabelled()
    expect(screen.getByRole('list', { name: 'Runway by account' })).toBeInTheDocument()
    expect(warn).not.toHaveBeenCalled()
  })

  it('names the listbox from aria-labelledby when rows are selectable', () => {
    renderLabelled({ onSelect: () => {} })
    expect(screen.getByRole('listbox', { name: 'Runway by account' })).toBeInTheDocument()
  })

  it('prefers aria-labelledby over title for the list name', () => {
    renderLabelled({ title: 'Runway' })
    expect(screen.getByRole('list', { name: 'Runway by account' })).toBeInTheDocument()
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
      'RunwayChart has duplicate row ids',
      'RunwayChart has no `title`',
    ]) {
      expect(text).toContain(phrase)
    }
  })

  it('is a plain list without onSelect, with no tab stop', () => {
    renderRunway()
    const list = screen.getByRole('list', { name: 'Runway' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(3)
    expect(list).not.toHaveAttribute('tabindex')
  })

  it('is a listbox with named options when selectable', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'team', description: 'Two run out' })
    const box = screen.getByRole('listbox', { name: 'Runway' })
    expect(box).toHaveAccessibleDescription('Two run out')
    expect(box).toHaveAttribute('tabindex', '0')
    const options = within(box).getAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Pro plan Runs out Fri 03:00 Resets Fri 11:00')
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[2]).toHaveAccessibleName('Starter Reconnect to forecast')
  })

  it('moves with the arrow, Home, End and Page keys and selects with Enter and Space', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    renderRunway({ onSelect, onActiveChange })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    const activeId = () => box.getAttribute('aria-activedescendant')
    const optionIds = within(box)
      .getAllByRole('option')
      .map((o) => o.id)
    expect(activeId()).toBe(optionIds[0])
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    expect(activeId()).toBe(optionIds[1])
    expect(onActiveChange).toHaveBeenLastCalledWith('team', expect.objectContaining({ id: 'team' }))
    fireEvent.keyDown(box, { key: 'End' })
    expect(activeId()).toBe(optionIds[2])
    fireEvent.keyDown(box, { key: 'PageUp' })
    expect(activeId()).toBe(optionIds[0])
    fireEvent.keyDown(box, { key: 'PageDown' })
    expect(activeId()).toBe(optionIds[2])
    fireEvent.keyDown(box, { key: 'Home' })
    fireEvent.keyDown(box, { key: 'Enter' })
    expect(onSelect).toHaveBeenLastCalledWith('pro', expect.objectContaining({ id: 'pro' }))
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    fireEvent.keyDown(box, { key: ' ' })
    expect(onSelect).toHaveBeenLastCalledWith('team', expect.objectContaining({ id: 'team' }))
  })

  it('starts keyboard focus on the selected row', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(
      within(box).getAllByRole('option')[2]?.id,
    )
  })

  it('leaves modified keys to the browser', () => {
    renderRunway({ onSelect: vi.fn() })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    for (const init of [{ altKey: true }, { ctrlKey: true }, { metaKey: true }]) {
      const event = new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
        ...init,
      })
      box.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(box.getAttribute('aria-activedescendant')).toBe(
      within(box).getAllByRole('option')[0]?.id,
    )
  })

  it('selects on click and activates on hover; Escape clears the active row', () => {
    const onSelect = vi.fn()
    const onActiveChange = vi.fn()
    renderRunway({ onSelect, onActiveChange })
    const options = screen.getAllByRole('option')
    fireEvent.pointerEnter(options[1] as HTMLElement)
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    fireEvent.click(options[1] as HTMLElement)
    expect(onSelect).toHaveBeenCalledWith('team', expect.objectContaining({ id: 'team' }))
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'Escape' })
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('falls back to the first row when the focused row disappears', () => {
    const { rerender } = renderRunway({ onSelect: vi.fn() })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'End' })
    rerender(
      <RunwayChart
        rows={rows.slice(0, 2)}
        domain={domain}
        now={now}
        title="Runway"
        onSelect={vi.fn()}
      />,
    )
    const ids = within(screen.getByRole('listbox'))
      .getAllByRole('option')
      .map((o) => o.id)
    expect(ids).toContain(screen.getByRole('listbox').getAttribute('aria-activedescendant'))
  })

  it('renders the data table with one row per entity', () => {
    const { container } = renderRunway({
      dataTable: { columns: { Name: 'Account' } },
      rows: [{ ...(rows[0] as RunwayRow), sublabel: 'Side project' }, ...rows.slice(1)],
    })
    const table = container.querySelector('[data-ch-part="data-table"]') as HTMLTableElement
    expect([...table.querySelectorAll('thead th')].map((th) => th.textContent)).toEqual([
      'Account',
      'Detail',
      'Runs out',
      'Resets',
      'Projected at reset',
      'Status',
    ])
    const first = [...(table.querySelectorAll('tbody tr')[0]?.children ?? [])].map(
      (c) => c.textContent,
    )
    expect(first).toEqual([
      'Pro plan',
      'Side project',
      'Fri 03:00',
      'Fri 11:00',
      '100%',
      'Runs out Fri 03:00, Resets Fri 11:00',
    ])
    const starter = [...(table.querySelectorAll('tbody tr')[2]?.children ?? [])].map(
      (c) => c.textContent,
    )
    expect(starter.at(-1)).toBe('Reconnect to forecast')
  })

  it('lets a controlled activeId decide the active row', () => {
    const onActiveChange = vi.fn()
    const props = { onSelect: vi.fn(), onActiveChange }
    const { rerender } = renderRunway({ ...props, activeId: 'team' })
    const options = screen.getAllByRole('option')
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    fireEvent.pointerEnter(options[0] as HTMLElement)
    expect(onActiveChange).toHaveBeenLastCalledWith('pro', expect.objectContaining({ id: 'pro' }))
    expect(options[0]).not.toHaveAttribute('data-ch-active')
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    rerender(
      <RunwayChart
        rows={rows}
        domain={domain}
        now={now}
        title="Runway"
        {...props}
        activeId="pro"
      />,
    )
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('data-ch-active', 'true')
    expect(screen.getAllByRole('option')[1]).not.toHaveAttribute('data-ch-active')
  })

  it('ignores Escape when nothing is active', () => {
    const onActiveChange = vi.fn()
    renderRunway({ onSelect: vi.fn(), onActiveChange })
    const box = screen.getByRole('listbox')
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    box.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
    expect(onActiveChange).not.toHaveBeenCalled()
  })

  it('renders the data table by default, with a string status as the Status text', () => {
    const { container } = render(
      <RunwayChart
        rows={rows}
        domain={domain}
        now={now}
        title="Runway"
        status={(row) => (row.id === 'team' ? 'On track' : undefined)}
      />,
    )
    const table = container.querySelector('[data-ch-part="data-table"]')
    expect(table).not.toBeNull()
    const status = [...(table?.querySelectorAll('tbody tr') ?? [])].map(
      (tr) => tr.lastElementChild?.textContent,
    )
    expect(status).toEqual([
      'Runs out Fri 03:00, Resets Fri 11:00',
      'On track',
      'Reconnect to forecast',
    ])
    expect(
      renderRunway({ dataTable: false }).container.querySelector('[data-ch-part="data-table"]'),
    ).toBeNull()
  })

  it('renders no status for null, and names the option from a string status', () => {
    const { container } = renderRunway({
      onSelect: vi.fn(),
      status: (row) => (row.id === 'pro' ? null : row.id === 'team' ? 'On track' : undefined),
      rows: [
        rows[0] as RunwayRow,
        rows[1] as RunwayRow,
        { ...(rows[2] as RunwayRow), status: undefined },
      ],
    })
    const statuses = part(container, 'runway-status').map((el) => el.textContent)
    expect(statuses).toEqual(['', 'On track', 'Disconnected'])
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAccessibleName('Pro plan')
    expect(options[1]).toHaveAccessibleName('Team seat On track')
    const cells = [...container.querySelectorAll('[data-ch-part="data-table"] tbody tr')].map(
      (tr) => tr.lastElementChild?.textContent,
    )
    expect(cells).toEqual(['—no value', 'On track', 'Disconnected'])
  })

  it('marks the selected row in list mode too', () => {
    const { container } = renderRunway({ selectedId: 'team' })
    const marked = part(container, 'runway-row').map((r) => r.getAttribute('data-ch-selected'))
    expect(marked).toEqual([null, 'true', null])
    expect(part(container, 'runway-row')[1]).not.toHaveAttribute('aria-selected')
  })

  it('does not move the keyboard cursor on hover', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    // Hover before focus: tabbing in still starts on the selected row.
    fireEvent.pointerEnter(options[0] as HTMLElement)
    expect(options[0]).toHaveAttribute('data-ch-active', 'true')
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[2]?.id)
    // Hover while focused: highlights the row, the cursor stays.
    fireEvent.pointerEnter(options[1] as HTMLElement)
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    expect(box.getAttribute('aria-activedescendant')).toBe(options[2]?.id)
    fireEvent.keyDown(box, { key: 'ArrowUp' })
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1]?.id)
  })

  it('puts the cursor on a pressed row without scrolling to another row', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    const scroll = vi.fn()
    for (const o of options) o.scrollIntoView = scroll
    fireEvent.pointerDown(options[1] as HTMLElement)
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1]?.id)
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    expect(scroll).not.toHaveBeenCalled()
    // Keyboard focus later scrolls as usual.
    act(() => box.blur())
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1]?.id)
    expect(scroll).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['pointercancel', (box: HTMLElement) => fireEvent.pointerCancel(box)],
    ['pointerleave', (box: HTMLElement) => fireEvent.pointerLeave(box)],
  ])('forgets a pressed row on %s, so the next focus starts on the selected row', (_, end) => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    fireEvent.pointerDown(options[1] as HTMLElement)
    end(box)
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[2]?.id)
    expect(options[1]).not.toHaveAttribute('data-ch-active')
    expect(options[2]).toHaveAttribute('data-ch-active', 'true')
  })

  it('keeps the pressed row through the pointerleave that ends a touch tap', () => {
    renderRunway({ onSelect: vi.fn(), selectedId: 'starter' })
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    fireEvent.pointerDown(options[1] as HTMLElement, { pointerType: 'touch' })
    fireEvent.pointerUp(options[1] as HTMLElement, { pointerType: 'touch' })
    fireEvent.pointerLeave(box, { pointerType: 'touch' })
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1]?.id)
  })

  it('moves the cursor with a controlled activeId set from outside', () => {
    const props = { onSelect: vi.fn(), selectedId: 'starter' }
    const view = (activeId: string) => (
      <RunwayChart
        rows={rows}
        domain={domain}
        now={now}
        title="Runway"
        {...props}
        activeId={activeId}
      />
    )
    const { rerender } = render(view('pro'))
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[0]?.id)
    rerender(view('starter'))
    expect(box.getAttribute('aria-activedescendant')).toBe(options[2]?.id)
    expect(options[2]).toHaveAttribute('data-ch-focus', 'true')
    expect(options[2]).toHaveAttribute('data-ch-active', 'true')
    expect(options[0]).not.toHaveAttribute('data-ch-focus')
  })

  it('starts the next focus on a controlled activeId that changed while unfocused', () => {
    const props = { onSelect: vi.fn(), selectedId: 'starter' }
    const view = (activeId: string) => (
      <RunwayChart
        rows={rows}
        domain={domain}
        now={now}
        title="Runway"
        {...props}
        activeId={activeId}
      />
    )
    const { rerender } = render(view('pro'))
    rerender(view('team'))
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    act(() => box.focus())
    expect(box.getAttribute('aria-activedescendant')).toBe(options[1]?.id)
  })

  it('warns once with every duplicate id and marks only the first such row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dup = [
      { id: 'pro', label: 'Pro A' },
      { id: 'pro', label: 'Pro B' },
      { id: 'team', label: 'Team A' },
      { id: 'team', label: 'Team B' },
    ]
    renderRunway({ rows: dup, onSelect: vi.fn(), activeId: 'pro', selectedId: 'team' })
    const messages = warn.mock.calls.map(([m]) => String(m)).filter((m) => m.includes('duplicate'))
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('"pro"')
    expect(messages[0]).toContain('"team"')
    const options = screen.getAllByRole('option')
    expect(options.filter((o) => o.hasAttribute('data-ch-active'))).toEqual([options[0]])
    expect(options.filter((o) => o.hasAttribute('data-ch-selected'))).toEqual([options[2]])
    expect(options.filter((o) => o.getAttribute('aria-selected') === 'true')).toEqual([options[2]])
  })

  it.each([
    ['pointerUp', fireEvent.pointerUp],
    ['pointerCancel', fireEvent.pointerCancel],
  ])('clears hover on touch %s', (_, end) => {
    const onActiveChange = vi.fn()
    renderRunway({ onSelect: vi.fn(), onActiveChange })
    const box = screen.getByRole('listbox')
    const options = within(box).getAllByRole('option')
    fireEvent.pointerEnter(options[1] as HTMLElement)
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
    end(options[1] as HTMLElement, { pointerType: 'touch' })
    expect(options[1]).not.toHaveAttribute('data-ch-active')
    expect(onActiveChange).toHaveBeenLastCalledWith(null, null)
  })

  it('keeps hover on mouse pointerUp', () => {
    renderRunway({ onSelect: vi.fn() })
    const options = screen.getAllByRole('option')
    fireEvent.pointerEnter(options[1] as HTMLElement)
    fireEvent.pointerUp(options[1] as HTMLElement, { pointerType: 'mouse' })
    expect(options[1]).toHaveAttribute('data-ch-active', 'true')
  })

  it('keeps the keyboard cursor on its row when the rows are reordered', () => {
    const { rerender } = renderRunway({ onSelect: vi.fn() })
    const box = screen.getByRole('listbox')
    act(() => box.focus())
    fireEvent.keyDown(box, { key: 'ArrowDown' })
    rerender(
      <RunwayChart
        rows={[rows[1] as RunwayRow, rows[0] as RunwayRow, rows[2] as RunwayRow]}
        domain={domain}
        now={now}
        title="Runway"
        onSelect={vi.fn()}
      />,
    )
    const list = screen.getByRole('listbox')
    const target = document.getElementById(list.getAttribute('aria-activedescendant') ?? '')
    expect(target).toHaveAccessibleName(expect.stringMatching(/^Team seat/))
  })
})
