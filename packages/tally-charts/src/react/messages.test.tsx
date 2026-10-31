import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { thresholds } from '../core/thresholds'
import { Chart } from './Chart'
import { ChartsProvider, useMessages } from './ChartsProvider'
import { Heatmap } from './charts/Heatmap'
import { RunwayChart } from './charts/RunwayChart'
import { Bars } from './marks/Bars'
import { DEFAULT_MESSAGES, formatMessage } from './messages'
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

describe('useMessages', () => {
  function Probe() {
    const m = useMessages()
    return <span>{m === DEFAULT_MESSAGES ? 'same' : 'other'}</span>
  }
  it('returns DEFAULT_MESSAGES itself without a prop', () => {
    render(
      <ChartsProvider>
        <Probe />
      </ChartsProvider>,
    )
    expect(screen.getByText('same')).toBeInTheDocument()
  })
  it('a nested provider replaces its parent, not merges', () => {
    function Noun() {
      const m = useMessages()
      return (
        <span>
          {m.noData}|{m.now}
        </span>
      )
    }
    render(
      <ChartsProvider messages={{ noData: 'A', now: 'Teraz' }}>
        <ChartsProvider messages={{ noData: 'B' }}>
          <Noun />
        </ChartsProvider>
      </ChartsProvider>,
    )
    expect(screen.getByText('B|Now')).toBeInTheDocument()
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
})
