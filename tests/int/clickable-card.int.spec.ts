import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import useClickableCard from '@/utilities/useClickableCard'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function ClickableCard() {
  const { cardRef, linkRef } = useClickableCard<HTMLElement>({})
  return createElement(
    'article',
    { ref: cardRef },
    createElement('span', null, 'Card body'),
    createElement('a', { ref: linkRef, href: '/posts/example' }, 'Read post'),
  )
}

it('navigates from the card body without intercepting its link or modified clicks', () => {
  render(createElement(ClickableCard))
  const body = screen.getByText('Card body')
  fireEvent.mouseDown(body, { button: 0 })
  fireEvent.mouseUp(body, { button: 0 })
  expect(push).toHaveBeenCalledWith(expect.stringContaining('/posts/example'), { scroll: true })
  push.mockClear()
  const link = screen.getByText('Read post')
  fireEvent.mouseDown(link, { button: 0 })
  fireEvent.mouseUp(link, { button: 0 })
  fireEvent.mouseDown(body, { button: 0, ctrlKey: true })
  fireEvent.mouseUp(body, { button: 0, ctrlKey: true })
  expect(push).not.toHaveBeenCalled()
})
