import type { ReactNode } from 'react'

export default function DevelopmentLayout({ children }: { children: ReactNode }) {
  return <div data-site="development">{children}</div>
}
