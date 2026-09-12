import type { ReactNode } from 'react'

export default function ProductLayout({ children }: { children: ReactNode }) {
  return <div data-site="product">{children}</div>
}
