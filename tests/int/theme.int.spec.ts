import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ThemeProvider, useTheme } from '@/providers/Theme'

function ThemeControls() {
  const { theme, preference, setTheme } = useTheme()
  return createElement(
    'div',
    null,
    createElement('output', null, `${preference}:${theme ?? 'pending'}`),
    createElement('button', { onClick: () => setTheme('light') }, 'Light'),
    createElement('button', { onClick: () => setTheme(null) }, 'Auto'),
  )
}

const app = () => createElement(ThemeProvider, null, createElement(ThemeControls))
let darkMode: boolean
let mediaEvents: EventTarget

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  darkMode = true
  mediaEvents = new EventTarget()
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return darkMode
    },
    addEventListener: mediaEvents.addEventListener.bind(mediaEvents),
    removeEventListener: mediaEvents.removeEventListener.bind(mediaEvents),
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('Theme synchronization', () => {
  it('hydrates a saved preference without mismatching the server HTML', async () => {
    window.localStorage.setItem('payload-theme', 'dark')
    const container = document.createElement('div')
    container.innerHTML = renderToString(app())
    expect(container.textContent).toContain('auto:pending')
    document.body.append(container)
    const onRecoverableError = vi.fn()
    let root: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, app(), { onRecoverableError })
    })
    expect(container.textContent).toContain('dark:dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(onRecoverableError).not.toHaveBeenCalled()
    await act(async () => root.unmount())
    container.remove()
  })

  it('persists explicit choices and follows the system when switched back to Auto', () => {
    render(app())
    expect(screen.getByRole('status').textContent).toBe('auto:dark')
    fireEvent.click(screen.getByText('Light'))
    expect(window.localStorage.getItem('payload-theme')).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    fireEvent.click(screen.getByText('Auto'))
    expect(window.localStorage.getItem('payload-theme')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('auto:dark')
    act(() => {
      darkMode = false
      mediaEvents.dispatchEvent(new Event('change'))
    })
    expect(screen.getByRole('status').textContent).toBe('auto:light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('picks up preference changes from another tab', () => {
    render(app())
    act(() => {
      window.localStorage.setItem('payload-theme', 'light')
      window.dispatchEvent(new StorageEvent('storage', { key: 'payload-theme' }))
    })
    expect(screen.getByRole('status').textContent).toBe('light:light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})
