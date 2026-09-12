import clsx from 'clsx'
import React from 'react'
import { siteName } from '@/utilities/site'

interface Props {
  className?: string
}

export const Logo = (props: Props) => {
  const { className } = props

  return <span className={clsx('text-xl font-semibold tracking-tight', className)}>{siteName}</span>
}
