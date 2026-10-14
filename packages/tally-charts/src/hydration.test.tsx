import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LastTwelveWeeks } from '../test/fixtures'

describe('hydration', () => {
  it('hydrates server markup without mismatches', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const html = renderToString(<LastTwelveWeeks />)
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    const onRecoverableError = vi.fn()
    await act(async () => {
      hydrateRoot(container, <LastTwelveWeeks />, { onRecoverableError })
    })
    expect(onRecoverableError).not.toHaveBeenCalled()
    const hydrationErrors = errors.mock.calls.filter((call) =>
      String(call[0]).toLowerCase().includes('hydrat'),
    )
    expect(hydrationErrors).toEqual([])
    container.remove()
  })
})
