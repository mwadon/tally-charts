import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ChartsProvider, useFormat } from './ChartsProvider'

function Probe() {
  const f = useFormat()
  return (
    <span>
      {f.currency(3240)} | {f.create('pts')(-1.6)}
    </span>
  )
}

describe('ChartsProvider / useFormat', () => {
  it('uses en-US and USD without a provider', () => {
    render(<Probe />)
    expect(screen.getByText('$3,240 | −1.6 pts')).toBeInTheDocument()
  })

  it('uses the provider locale and currency', () => {
    render(
      <ChartsProvider locale="de-DE" currency="EUR">
        <Probe />
      </ChartsProvider>,
    )
    expect(screen.getByText('3.240 € | −1,6 pts')).toBeInTheDocument()
  })
})
