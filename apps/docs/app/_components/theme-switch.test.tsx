import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'
import { THEME_STORAGE_KEY } from '../../lib/theme'
import { ThemeSwitch } from './theme-switch'

const html = document.documentElement

beforeEach(() => {
  html.removeAttribute('data-ch-theme')
  localStorage.clear()
})

test('is a combobox named Theme with System, Light and Dark', () => {
  render(<ThemeSwitch />)
  const select = screen.getByRole('combobox', { name: 'Theme' }) as HTMLSelectElement
  expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([
    ['system', 'System'],
    ['light', 'Light'],
    ['dark', 'Dark'],
  ])
  expect(select.value).toBe('system')
})

test('choosing Dark sets the attribute and storage; System removes both', () => {
  render(<ThemeSwitch />)
  const select = screen.getByRole('combobox', { name: 'Theme' }) as HTMLSelectElement

  fireEvent.change(select, { target: { value: 'dark' } })
  expect(html.getAttribute('data-ch-theme')).toBe('dark')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  expect(select.value).toBe('dark')

  fireEvent.change(select, { target: { value: 'light' } })
  expect(html.getAttribute('data-ch-theme')).toBe('light')
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

  fireEvent.change(select, { target: { value: 'system' } })
  expect(html.hasAttribute('data-ch-theme')).toBe(false)
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
})

test('shows the theme already set on <html> by the head script', () => {
  html.setAttribute('data-ch-theme', 'light')
  render(<ThemeSwitch />)
  expect((screen.getByRole('combobox', { name: 'Theme' }) as HTMLSelectElement).value).toBe('light')
})
