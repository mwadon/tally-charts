import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartsProvider, useFormat } from './ChartsProvider'

function Probe() {
  const f = useFormat()
  return (
    <span>
      {f.currency(3240)} | {f.create('pts')(-1.6)} | {f.date('month')(Date.UTC(2026, 4, 10))}
    </span>
  )
}

describe('ChartsProvider / useFormat', () => {
  it('uses en-US and USD without a provider', () => {
    render(<Probe />)
    expect(screen.getByText('$3,240 | −1.6 pts | May 2026')).toBeInTheDocument()
  })

  it('uses the provider locale and currency', () => {
    render(
      <ChartsProvider locale="de-DE" currency="EUR">
        <Probe />
      </ChartsProvider>,
    )
    expect(screen.getByText('3.240 € | −1,6 pts | Mai 2026')).toBeInTheDocument()
  })
})
