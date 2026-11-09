import { render } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { THEME_SCRIPT, THEME_STORAGE_KEY } from '../../lib/theme'
import { ThemeOnMount } from './theme-on-mount'

const html = document.documentElement
const attr = () => html.getAttribute('data-ch-theme')

beforeEach(() => {
  html.removeAttribute('data-ch-theme')
  localStorage.clear()
  history.replaceState(null, '', '/')
})

// Each case: [query, stored value]. The component must end where the head script ends.
test.each([
  ['?theme=dark', 'light'],
  ['?theme=light', null],
  ['?theme=sepia', 'dark'],
  ['?theme=sepia', null],
  ['', 'light'],
  ['', 'sepia'],
  ['', null],
])('with %j and storage %j it sets what THEME_SCRIPT sets, and stores nothing', (query, stored) => {
  if (stored) localStorage.setItem(THEME_STORAGE_KEY, stored)
  history.replaceState(null, '', `/docs/nope${query}`)
  new Function(THEME_SCRIPT)()
  const expected = attr()
  html.removeAttribute('data-ch-theme')

  render(<ThemeOnMount />)

  expect(attr()).toBe(expected)
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(stored)
})

test('it leaves alone a theme that is already on <html>', () => {
  localStorage.setItem(THEME_STORAGE_KEY, 'light')
  html.setAttribute('data-ch-theme', 'dark')

  render(<ThemeOnMount />)

  expect(attr()).toBe('dark')
})
