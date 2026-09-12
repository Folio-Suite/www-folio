import React from 'react'
import { render, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { Media } from '@/components/Media'

afterEach(cleanup)

it('renders the stored video URL including its Blob host and folder prefix', () => {
  const { container } = render(
    React.createElement(Media, {
      resource: {
        id: 1,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
        mimeType: 'video/mp4',
        filename: 'trip.mp4',
        url: 'https://example.public.blob.vercel-storage.com/media/trips/trip.mp4',
      },
    }),
  )
  expect(container.querySelector('video')?.hasAttribute('controls')).toBe(true)
  expect(container.querySelector('video')?.hasAttribute('autoplay')).toBe(false)
  expect(container.querySelector('video')?.getAttribute('preload')).toBe('metadata')
  expect(container.querySelector('video source')?.getAttribute('src')).toBe(
    'https://example.public.blob.vercel-storage.com/media/trips/trip.mp4',
  )
})

it('shows a video poster, accessible title and labeled caption track without autoplay', () => {
  const { container } = render(
    React.createElement(Media, {
      resource: {
        id: 2,
        createdAt: '2026-09-11T00:00:00Z',
        updatedAt: '2026-09-11T00:00:00Z',
        mimeType: 'video/mp4',
        url: '/media/trip.mp4',
        title: 'A walk in the park',
        poster: {
          id: 3,
          createdAt: '',
          updatedAt: '',
          mimeType: 'image/jpeg',
          url: '/media/park.jpg',
        },
        captionTracks: [{ label: 'English', language: 'en', url: '/media/park.en.vtt' }],
      },
    }),
  )
  expect(container.querySelector('video')?.getAttribute('aria-label')).toBe('A walk in the park')
  expect(container.querySelector('video')?.getAttribute('poster')).toContain('/media/park.jpg')
  expect(container.querySelector('track')?.getAttribute('srclang')).toBe('en')
  expect(container.querySelector('track')?.getAttribute('label')).toBe('English')
})

it('renders a responsive lazy image with dimensions and an intentional decorative alternative', () => {
  const { container } = render(
    React.createElement(Media, {
      alt: '',
      resource: {
        id: 3,
        createdAt: '',
        updatedAt: '',
        mimeType: 'image/jpeg',
        url: '/media/photo.jpg',
        alt: 'Record description',
        width: 1200,
        height: 800,
      },
    }),
  )
  const img = container.querySelector('img')!
  expect(img.alt).toBe('')
  expect(img.getAttribute('width')).toBe('1200')
  expect(img.getAttribute('height')).toBe('800')
  expect(img.getAttribute('loading')).toBe('lazy')
  expect(img.getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 1200px')
  expect(img.getAttribute('src')).toContain('q=75')
})
