'use client'

import React, { createContext, use, useSyncExternalStore } from 'react'

import type { ThemeContextType } from './types'
import {
  getServerPreference,
  getServerTheme,
  getTheme,
  getThemePreference,
  setTheme,
  subscribeTheme,
} from './store'

const initialContext: ThemeContextType = {
  setTheme: () => null,
  theme: undefined,
  preference: 'auto',
}

const ThemeContext = createContext(initialContext)

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useSyncExternalStore(subscribeTheme, getTheme, getServerTheme)
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference, getServerPreference)

  return <ThemeContext value={{ setTheme, theme, preference }}>{children}</ThemeContext>
}

export const useTheme = (): ThemeContextType => use(ThemeContext)
