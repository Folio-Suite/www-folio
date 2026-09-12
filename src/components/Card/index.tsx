'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { BlogEntry } from '@/payload-types'

import { Media } from '@/components/Media'

export type CardPostData = Pick<BlogEntry, 'slug' | 'categories' | 'meta' | 'title'> &
  Partial<Pick<BlogEntry, 'publishedAt' | 'updatedAt' | 'populatedAuthors'>>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'blog'
  showCategories?: boolean
  title?: string
}> = (props) => {
  const { cardRef, linkRef } = useClickableCard<HTMLElement>({})
  const { className, doc, relationTo, showCategories, title: titleFromProps } = props

  const { slug, categories, meta, title, publishedAt, updatedAt, populatedAuthors } = doc || {}
  const { description, image: metaImage } = meta || {}

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const sanitizedDescription = description?.replace(/\s/g, ' ') // replace non-breaking space with white space
  const href = `/${relationTo}/${encodeURIComponent(slug || '')}`

  return (
    <article
      className={cn(
        'h-entry border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer',
        className,
      )}
      ref={cardRef}
    >
      <div className="relative w-full ">
        {metaImage && typeof metaImage !== 'string' && (
          <Media
            resource={metaImage}
            size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>
      <div className="p-4">
        {showCategories && hasCategories && (
          <div className="uppercase text-sm mb-4">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category

                const categoryTitle = titleFromCategory || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <Fragment key={index}>
                    <Link
                      className="p-category"
                      href={`/blog/category/${encodeURIComponent(category.slug || '')}`}
                    >
                      {categoryTitle}
                    </Link>
                    {!isLast && <Fragment>, &nbsp;</Fragment>}
                  </Fragment>
                )
              }

              return null
            })}
          </div>
        )}
        {titleToUse && (
          <div className="prose">
            <h3 className="p-name">
              <Link className="u-url not-prose" href={href} ref={linkRef}>
                {titleToUse}
              </Link>
            </h3>
          </div>
        )}
        {description && (
          <div className="mt-2">
            {description && <p className="p-summary">{sanitizedDescription}</p>}
          </div>
        )}
        {publishedAt && (
          <p>
            <Link
              href={`/blog/archive/${new Date(publishedAt).toISOString().slice(0, 7).replace('-', '/')}`}
            >
              <time className="dt-published" dateTime={publishedAt}>
                {new Date(publishedAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}
              </time>
            </Link>
          </p>
        )}
        {updatedAt && (
          <time className="dt-updated sr-only" dateTime={updatedAt}>
            {updatedAt}
          </time>
        )}
        {populatedAuthors
          ?.filter((author) => author.name)
          .map((author) => (
            <Link
              className="p-author h-card mr-3"
              key={author.id}
              href={`/blog/author/${author.id}`}
            >
              <span className="p-name">{author.name}</span>
            </Link>
          ))}
      </div>
    </article>
  )
}
