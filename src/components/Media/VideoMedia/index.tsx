'use client'

import { cn } from '@/utilities/ui'
import React from 'react'
import type { Props as MediaProps } from '../types'
import { getMediaUrl } from '@/utilities/getMediaUrl'

export const VideoMedia: React.FC<MediaProps> = ({
  onClick,
  resource,
  videoClassName,
  autoplay,
  loop,
  muted,
}) => {
  if (!resource || typeof resource !== 'object' || !resource.url) return null
  const poster =
    resource.poster && typeof resource.poster === 'object' ? resource.poster.url : undefined
  return (
    <video
      className={cn('w-full aspect-video', videoClassName)}
      controls
      autoPlay={autoplay || false}
      loop={loop || false}
      muted={Boolean(autoplay || muted)}
      crossOrigin={resource.captionTracks?.length ? 'anonymous' : undefined}
      aria-label={resource.title || resource.alt || undefined}
      poster={poster ? getMediaUrl(poster) : undefined}
      onClick={onClick}
      playsInline
      preload="metadata"
    >
      <source src={getMediaUrl(resource.url)} type={resource.mimeType || undefined} />
      {resource.captionTracks?.map((track) => (
        <track
          key={track.id || track.url}
          kind="captions"
          src={getMediaUrl(track.url)}
          srcLang={track.language}
          label={track.label}
        />
      ))}
    </video>
  )
}
