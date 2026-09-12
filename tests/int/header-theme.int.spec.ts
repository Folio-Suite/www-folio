import { cleanup, render } from '@testing-library/react'
import { createElement, useEffect } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, expect, it, vi } from 'vitest'

import { HeaderClient } from '@/Header/Component.client'
import { HeaderThemeProvider, useHeaderTheme } from '@/providers/HeaderTheme'
import type { Theme } from '@/providers/Theme/types'

const navigation = vi.hoisted(() => ({ pathname: '/' }))
vi.mock('next/navigation', () => ({ usePathname: () => navigation.pathname }))
vi.mock('@/components/Logo/Logo', () => ({ Logo: () => null }))
vi.mock('@/Header/Nav', () => ({ HeaderNav: () => null }))
afterEach(cleanup)

function PageTheme({ theme }: { theme: Theme }) {
  const { setHeaderTheme } = useHeaderTheme()
  useEffect(() => {
    setHeaderTheme(theme)
  }, [setHeaderTheme, theme])
  return null
}

const app = (theme: Theme) =>
  createElement(
    HeaderThemeProvider,
    null,
    createElement(HeaderClient, { data: { id: 1, navItems: [] } }),
    createElement(PageTheme, { theme }),
  )

it('uses the page theme and updates it after navigation', () => {
  navigation.pathname = '/posts/example'
  const view = render(app('dark'))
  expect(view.container.querySelector('header')?.getAttribute('data-theme')).toBe('dark')
  navigation.pathname = '/contact'
  view.rerender(app('light'))
  expect(view.container.querySelector('header')?.getAttribute('data-theme')).toBe('light')
})

it('keeps server markup independent of the browser document theme', () => {
  document.documentElement.setAttribute('data-theme', 'dark')
  expect(renderToString(app('light'))).not.toContain('data-theme')
})
