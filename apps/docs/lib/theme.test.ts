import { beforeEach, describe, expect, test, vi } from 'vitest'
import { applyTheme, readStoredTheme, THEME_SCRIPT, THEME_STORAGE_KEY } from './theme'

const html = document.documentElement
const run = () => new Function(THEME_SCRIPT)()

beforeEach(() => {
  html.removeAttribute('data-ch-theme')
  localStorage.clear()
  history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('THEME_SCRIPT', () => {
  test('?theme=dark wins over localStorage=light and stores nothing', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    history.replaceState(null, '', '/?theme=dark')
    run()
    expect(html.getAttribute('data-ch-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  test('?theme=dark without storage does not write to storage', () => {
    history.replaceState(null, '', '/?theme=dark')
    run()
    expect(html.getAttribute('data-ch-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  test('an unknown ?theme= is ignored and the stored value applies', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    history.replaceState(null, '', '/?theme=sepia')
    run()
    expect(html.getAttribute('data-ch-theme')).toBe('dark')
  })

  test('an unknown stored value sets no attribute', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
    run()
    expect(html.hasAttribute('data-ch-theme')).toBe(false)
  })

  test('no query and no storage sets no attribute', () => {
    run()
    expect(html.hasAttribute('data-ch-theme')).toBe(false)
  })

  test('a throwing localStorage does not break the script', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(run).not.toThrow()
    expect(html.hasAttribute('data-ch-theme')).toBe(false)
  })
})

describe('applyTheme', () => {
  test.each(['light', 'dark'] as const)('%s sets the attribute and storage', (choice) => {
    applyTheme(choice)
    expect(html.getAttribute('data-ch-theme')).toBe(choice)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(choice)
  })

  test('system removes the attribute and the key', () => {
    applyTheme('dark')
    applyTheme('system')
    expect(html.hasAttribute('data-ch-theme')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  test('still sets the attribute when storage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => applyTheme('dark')).not.toThrow()
    expect(html.getAttribute('data-ch-theme')).toBe('dark')
  })
})

test('readStoredTheme falls back to system for unknown values', () => {
  expect(readStoredTheme()).toBe('system')
  localStorage.setItem(THEME_STORAGE_KEY, 'light')
  expect(readStoredTheme()).toBe('light')
  localStorage.setItem(THEME_STORAGE_KEY, 'sepia')
  expect(readStoredTheme()).toBe('system')
})
