import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { thresholds } from '../core/thresholds'
import { Chart } from './Chart'
import { ChartsProvider } from './ChartsProvider'
import { BarChart } from './charts/BarChart'
import { BridgeChart } from './charts/BridgeChart'
import { ComparisonBars } from './charts/ComparisonBars'
import { DotHistogram } from './charts/DotHistogram'
import { Heatmap } from './charts/Heatmap'
import { LineChart } from './charts/LineChart'
import { RankedBars } from './charts/RankedBars'
import { RunwayChart } from './charts/RunwayChart'
import { StripPlot } from './charts/StripPlot'
import { WaffleColumns } from './charts/WaffleColumns'
import { WaterfallChart } from './charts/WaterfallChart'
import { Bars } from './marks/Bars'
import { DEFAULT_MESSAGES, formatMessage } from './messages'
import { Delta } from './ui/Delta'
import { InlineBar } from './ui/InlineBar'
import { Meter } from './ui/Meter'
import { RangeMeter } from './ui/RangeMeter'
import { ShareBar } from './ui/ShareBar'
import { ZoneMeter } from './ui/ZoneMeter'

describe('formatMessage', () => {
  it('fills placeholders', () => {
    expect(formatMessage('{index} z {total}', { index: 3, total: 10 })).toBe('3 z 10')
  })
  it('leaves unknown placeholders as text', () => {
    expect(formatMessage('{x}', {})).toBe('{x}')
  })
  it('returns a template without placeholders as is', () => {
    expect(formatMessage('Brak danych', { index: 1 })).toBe('Brak danych')
  })
})

describe('nested ChartsProvider', () => {
  // Reads noData and targetLabel, through a real component.
  const probe = (
    <>
      <InlineBar value={Number.NaN} max={10} label="i" />
      <Meter value={3} target={5} label="m" />
    </>
  )
  const noData = () => screen.getByRole('img').getAttribute('aria-label')
  const targetLabel = (container: HTMLElement) =>
    container.querySelector('[data-ch-part="meter-target-label"]')?.textContent

  it('keeps the default of a key whose value is undefined', () => {
    const { container } = render(
      <ChartsProvider messages={{ noData: undefined, targetLabel: 'Cel {value}' }}>
        {probe}
      </ChartsProvider>,
    )
    expect(noData()).toBe('i: No data')
    expect(targetLabel(container)).toBe('Cel 5')
  })
  it('one with the prop replaces its parent: keys it leaves out go back to English', () => {
    const { container } = render(
      <ChartsProvider messages={{ noData: 'A', targetLabel: 'Cel {value}' }}>
        <ChartsProvider messages={{ noData: 'B' }}>{probe}</ChartsProvider>
      </ChartsProvider>,
    )
    expect(noData()).toBe('i: B')
    expect(targetLabel(container)).toBe('Target 5')
  })
  it('one without the prop inherits its parent, and can still change the currency', () => {
    const { container } = render(
      <ChartsProvider messages={{ noData: 'A', targetLabel: 'Cel {value}' }}>
        <ChartsProvider currency="EUR">
          {probe}
          <Meter value={3} target={5} format="currency" label="c" />
        </ChartsProvider>
      </ChartsProvider>,
    )
    expect(noData()).toBe('i: A')
    const labels = container.querySelectorAll('[data-ch-part="meter-target-label"]')
    expect([...labels].map((l) => l.textContent)).toEqual(['Cel 5', 'Cel €5'])
  })
  it('an empty messages object is a replacement too', () => {
    render(
      <ChartsProvider messages={{ noData: 'A' }}>
        <ChartsProvider messages={{}}>{probe}</ChartsProvider>
      </ChartsProvider>,
    )
    expect(noData()).toBe('i: No data')
  })
})

const rows = [
  { week: 'W1', n: 1 },
  { week: 'W2', n: 2 },
  { week: 'W3', n: 3 },
]

function plot(props: Record<string, unknown> = {}) {
  return (
    <Chart
      width={400}
      title="Probe"
      data={rows}
      x={{ type: 'band', field: 'week' }}
      y={{ field: 'n' }}
      {...props}
    >
      <Bars />
    </Chart>
  )
}

describe('messages in the built-in text', () => {
  const pl = { noData: 'Brak danych' }

  it('an empty Chart says the translated noData', () => {
    render(<ChartsProvider messages={pl}>{plot({ data: [] })}</ChartsProvider>)
    expect(screen.getByText('Brak danych')).toBeInTheDocument()
  })

  it('the empty prop wins over messages', () => {
    render(<ChartsProvider messages={pl}>{plot({ data: [], empty: 'Nic' })}</ChartsProvider>)
    expect(screen.getByText('Nic')).toBeInTheDocument()
    expect(screen.queryByText('Brak danych')).toBeNull()
  })

  it('Meter, InlineBar, RangeMeter, ZoneMeter and ShareBar use noData, others stay English', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const zones = thresholds([2.5, 4], ['gain', 'warn', 'loss'], ['Good', 'Ok', 'Poor'])
    const bad = [{ label: 'a', value: Number.NaN }]
    const { container } = render(
      <ChartsProvider messages={pl}>
        <Meter value={Number.NaN} target={5} label="m" />
        <InlineBar value={Number.NaN} max={10} label="i" />
        <RangeMeter value={Number.NaN} reference={3} label="r" />
        <ZoneMeter value={Number.NaN} zones={zones} max={6} label="z" />
        <ShareBar label="s" segments={bad} legend={false} />
        <Meter value={3} target={5} label="en" />
        <ShareBar label="s2" segments={bad} legend />
      </ChartsProvider>,
    )
    expect(screen.getByRole('meter', { name: 'm' })).toHaveAttribute(
      'aria-valuetext',
      'Brak danych',
    )
    expect(screen.getByRole('img', { name: 'i: Brak danych' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'r: Brak danych' })).toBeInTheDocument()
    expect(screen.getByRole('meter', { name: 'z' })).toHaveAttribute(
      'aria-valuetext',
      'Brak danych',
    )
    expect(screen.getByRole('meter', { name: 'en' })).toHaveAttribute(
      'aria-valuetext',
      '3, target 5',
    )
    expect(screen.getByRole('img', { name: 's: Brak danych' })).toBeInTheDocument()
    expect(container.querySelector('[data-ch-part="share-empty"]')?.textContent).toBe('Brak danych')
  })

  it('Meter and InlineBar use target and targetLabel; the targetLabel prop wins', () => {
    const m = { target: 'cel {value}', targetLabel: 'Cel {value}' }
    const { container } = render(
      <ChartsProvider messages={m}>
        <Meter value={3} target={5} label="m" />
        <Meter value={3} target={5} targetLabel="Własny" label="m2" />
        <InlineBar value={3} max={10} target={5} label="i" />
      </ChartsProvider>,
    )
    expect(screen.getByRole('meter', { name: 'm' })).toHaveAttribute('aria-valuetext', '3, cel 5')
    const labels = container.querySelectorAll('[data-ch-part="meter-target-label"]')
    expect([...labels].map((l) => l.textContent)).toEqual(['Cel 5', 'Własny'])
    expect(screen.getByRole('img', { name: 'i: 3, cel 5' })).toBeInTheDocument()
  })

  it('Heatmap uses noData, total and the empty prop; totalLabel wins', () => {
    const data = [{ r: 'a', c: 'x', v: 1 }]
    const { rerender } = render(
      <ChartsProvider messages={{ ...pl, total: 'Razem' }}>
        <Heatmap data={data} breaks={[1]} row="r" column="c" value="v" title="h" />
      </ChartsProvider>,
    )
    expect(screen.getAllByText('Razem').length).toBeGreaterThan(0)
    rerender(
      <ChartsProvider messages={{ ...pl, total: 'Razem' }}>
        <Heatmap
          data={data}
          breaks={[1]}
          row="r"
          column="c"
          value="v"
          title="h"
          totalLabel="Suma"
        />
      </ChartsProvider>,
    )
    expect(screen.getAllByText('Suma').length).toBeGreaterThan(0)
    expect(screen.queryByText('Razem')).toBeNull()
    rerender(
      <ChartsProvider messages={pl}>
        <Heatmap data={[]} breaks={[1]} row="r" column="c" value="v" title="h" />
      </ChartsProvider>,
    )
    expect(screen.getByText('Brak danych')).toBeInTheDocument()
  })

  it('RunwayChart uses noData when empty', () => {
    render(
      <ChartsProvider messages={pl}>
        <RunwayChart rows={[]} now={Date.UTC(2026, 0, 1)} domain={[0, 1]} title="r" />
      </ChartsProvider>,
    )
    expect(screen.getByText('Brak danych')).toBeInTheDocument()
  })

  it('the position template reaches the live region, even without placeholders', () => {
    const { container, rerender } = render(
      <ChartsProvider messages={{ position: '{index} z {total}' }}>{plot()}</ChartsProvider>,
    )
    const figure = screen.getByRole('application')
    fireEvent.focus(figure)
    expect(container.querySelector('[aria-live]')?.textContent).toBe('1 z 3, W1, 1')
    rerender(<ChartsProvider messages={{ position: 'punkt' }}>{plot()}</ChartsProvider>)
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(container.querySelector('[aria-live]')?.textContent).toBe('punkt, W2, 2')
  })

  it('keyboardHint and keyboardHintSelect come from messages; the prop wins; empty removes it', () => {
    const m = { keyboardHint: 'Strzałki.', keyboardHintSelect: 'Enter wybiera.' }
    const { container, rerender } = render(
      <ChartsProvider messages={m}>{plot({ onSelect: () => {} })}</ChartsProvider>,
    )
    const hint = () => container.querySelector('[id$="-hint"]')?.textContent
    expect(hint()).toBe('Strzałki. Enter wybiera.')
    rerender(<ChartsProvider messages={m}>{plot({ keyboardHint: 'Moje.' })}</ChartsProvider>)
    expect(hint()).toBe('Moje.')
    rerender(
      <ChartsProvider messages={{ keyboardHint: '' }}>
        {plot({ onSelect: () => {} })}
      </ChartsProvider>,
    )
    expect(hint()).toBeUndefined()
  })

  it('chartRole is translated', () => {
    const { container } = render(
      <ChartsProvider messages={{ chartRole: 'wykres' }}>{plot()}</ChartsProvider>,
    )
    fireEvent.focus(container.querySelector('[data-ch-part="plot"]') as Element)
    expect(
      container.querySelector('[aria-roledescription]')?.getAttribute('aria-roledescription'),
    ).toBe('wykres')
  })
  it('keyboardHintSelect left empty adds no trailing space', () => {
    const { container } = render(
      <ChartsProvider messages={{ keyboardHintSelect: '' }}>
        {plot({ onSelect: () => {} })}
      </ChartsProvider>,
    )
    const text = container.querySelector('[id$="-hint"]')?.textContent
    expect(text).toBe(DEFAULT_MESSAGES.keyboardHint)
  })
})

describe('table headers', () => {
  const headerKeys = Object.keys(DEFAULT_MESSAGES).filter((k) => k.startsWith('header'))
  const marked = Object.fromEntries(headerKeys.map((k) => [k, `«${k}»`]))
  const t = new Date('2026-01-05T00:00:00Z').getTime()
  const runwayRows = [
    {
      id: 'a',
      label: 'A',
      sublabel: 'sub',
      projection: [
        { at: t, used: 0.5 },
        { at: t + 36e5, used: 1 },
      ],
      runsOutAt: t + 36e5,
      resetAt: t + 3 * 36e5,
    },
  ]
  const heads = (container: HTMLElement) =>
    [...container.querySelectorAll('table thead th')].map((th) => th.textContent)
  type Row = { a: string; v: number; g: string; w: number }
  // Function accessors, so every header comes from its fallback and none from a field name.
  const by = {
    a: (d: Row) => d.a,
    v: (d: Row) => d.v,
    g: (d: Row) => d.g,
    w: (d: Row) => d.w,
  }
  const data: Row[] = [
    { a: 'x', v: 1, g: 'p', w: 2 },
    { a: 'y', v: 2, g: 'q', w: 3 },
  ]
  const common = { width: 500, title: 'T', animate: false } as const

  it('every header key reaches some chart table', () => {
    const seen = new Set<string | null>()
    const take = (node: React.ReactElement) => {
      const { container, unmount } = render(
        <ChartsProvider messages={marked}>{node}</ChartsProvider>,
      )
      for (const h of heads(container)) seen.add(h)
      // The row header of a Heatmap is read, not tabulated.
      for (const el of container.querySelectorAll('.ch-sr-only')) seen.add(el.textContent)
      unmount()
    }
    take(<BarChart<Row> data={data} x={by.a} y={by.v} {...common} />)
    take(
      <LineChart<Row>
        data={data}
        x={by.a}
        series={[{ id: 's', label: 'S', value: 'v' }]}
        band={{ low: 'v', high: 'w' }}
        {...common}
      />,
    )
    take(
      <LineChart<{ at: string; v: number }>
        data={[
          { at: '2026-01-01', v: 1 },
          { at: '2026-01-02', v: 2 },
        ]}
        x={{ type: 'time', field: (d) => d.at }}
        series={[{ id: 's', label: 'S', value: 'v' }]}
        {...common}
      />,
    )
    take(
      <DotHistogram<Row>
        data={data}
        value={by.v}
        label={by.a}
        toneBy={thresholds([1.5], ['loss', 'gain'], ['Low', 'High'])}
        {...common}
      />,
    )
    take(<ComparisonBars<Row> data={data} label={by.a} plan={by.v} actual={by.w} {...common} />)
    take(<RankedBars<Row> data={data} label={by.a} value={by.v} meta={by.g} {...common} />)
    take(
      <StripPlot<Row>
        data={data}
        label={by.a}
        series={[{ id: 's', label: 'S', value: 'v' }]}
        {...common}
      />,
    )
    take(<WaffleColumns<Row> data={data} x={by.a} y={by.v} group={by.g} {...common} />)
    take(
      <BridgeChart
        start={{ label: 'Plan', value: 10 }}
        steps={[{ label: 'Leak', value: -3 }]}
        {...common}
      />,
    )
    take(
      <WaterfallChart
        start={{ label: 'Plan', value: 10 }}
        steps={[{ label: 'Leak', value: -3 }]}
        {...common}
      />,
    )
    take(
      <RunwayChart
        rows={runwayRows}
        domain={[t, t + 24 * 36e5]}
        now={t}
        initialWidth={600}
        title="R"
      />,
    )
    take(
      <Heatmap<Row> data={data} breaks={[1.5]} row={by.a} column={by.g} value={by.v} title="H" />,
    )
    const missing = headerKeys.filter((k) => !seen.has(`«${k}»`))
    expect(missing).toEqual([])
  })

  it('a German headerTotal reaches the Waterfall table; a dataTable.columns entry wins', () => {
    const waterfall = (columns?: Record<string, string>) => (
      <ChartsProvider messages={{ headerTotal: 'Summe' }}>
        <WaterfallChart
          start={{ label: 'Plan', value: 10 }}
          steps={[{ label: 'Leak', value: -3 }]}
          dataTable={columns ? { columns } : true}
          {...common}
        />
      </ChartsProvider>
    )
    const { container, rerender } = render(waterfall())
    expect(heads(container)).toEqual(['Item', 'Change', 'Summe'])
    rerender(waterfall({ Summe: 'Gesamt' }))
    expect(heads(container)).toEqual(['Item', 'Change', 'Gesamt'])
  })

  it('a header taken from a string accessor keeps the field name', () => {
    const { container } = render(
      <ChartsProvider messages={marked}>
        <BarChart<Row> data={data} x="a" y="v" {...common} />
      </ChartsProvider>,
    )
    expect(heads(container)).toEqual(['A', 'V'])
  })
})

describe('other translated text', () => {
  const pl = {
    deltaUp: 'W górę',
    onPlan: 'Zgodnie z planem',
    waterfallStep: '{label}: {text} (razem {total})',
    runningTotalLabel: 'razem',
    planActual: '{label}: plan {plan}, wykonanie {actual}',
    binUnder: 'Poniżej {value}',
    binRange: '{from} do {to}',
    binOver: '{value} i więcej',
    statusRunsOut: 'Kończy się {date}',
    statusAtReset: '{percent}% do resetu',
    legendLocked: 'Zablokowane',
  }

  it('Delta reads the translated direction', () => {
    const { container } = render(
      <ChartsProvider messages={pl}>
        <Delta value={2} />
      </ChartsProvider>,
    )
    expect(container.querySelector('.ch-sr-only')?.textContent).toBe('W górę ')
  })

  it('Heatmap bins and the RunwayChart status and legend use their templates', () => {
    const rowsH = [
      { r: 'a', c: 'x', v: 1 },
      { r: 'a', c: 'y', v: 9 },
    ]
    const { container, unmount } = render(
      <ChartsProvider messages={pl}>
        <Heatmap data={rowsH} row="r" column="c" value="v" breaks={[3, 6]} title="H" />
      </ChartsProvider>,
    )
    expect(container.textContent).toContain('Poniżej 3')
    expect(container.textContent).toContain('3 do 6')
    expect(container.textContent).toContain('6 i więcej')
    unmount()
    const t = Date.UTC(2026, 0, 5)
    const r = render(
      <ChartsProvider messages={pl}>
        <RunwayChart
          rows={[
            {
              id: 'a',
              label: 'A',
              projection: [
                { at: t, used: 0.5 },
                { at: t + 36e5, used: 1 },
              ],
              runsOutAt: t + 36e5,
            },
          ]}
          domain={[t, t + 24 * 36e5]}
          now={t}
          initialWidth={600}
          title="R"
        />
      </ChartsProvider>,
    )
    expect(r.container.textContent).toContain('Kończy się ')
    expect(r.container.textContent).toContain('Zablokowane')
    expect(r.container.textContent).not.toContain('Runs out ')
  })

  it('ComparisonBars and WaterfallChart read their rows from the templates', () => {
    const c = render(
      <ChartsProvider messages={pl}>
        <ComparisonBars
          data={[{ n: 'A', p: 5, a: 5 }]}
          label="n"
          plan="p"
          actual="a"
          width={400}
          title="C"
          animate={false}
        />
      </ChartsProvider>,
    )
    expect(c.container.textContent).toContain('Zgodnie z planem')
    fireEvent.keyDown(screen.getByRole('application'), { key: 'ArrowRight' })
    expect(c.container.querySelector('[aria-live]')?.textContent).toContain(
      'A: plan 5, wykonanie 5',
    )
    c.unmount()
    const w = render(
      <ChartsProvider messages={pl}>
        <WaterfallChart
          start={{ label: 'Plan', value: 10 }}
          steps={[{ label: 'Leak', value: -3 }]}
          width={400}
          title="W"
          animate={false}
        />
      </ChartsProvider>,
    )
    const figure = screen.getByRole('application')
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    fireEvent.keyDown(figure, { key: 'ArrowRight' })
    expect(w.container.querySelector('[aria-live]')?.textContent).toContain('Leak: −3 (razem 7)')
    expect(w.container.querySelector('[data-ch-part="tooltip"]')?.textContent).toContain('razem')
  })
})
