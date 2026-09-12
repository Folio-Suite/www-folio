import { formatDateTime } from '@/utilities/formatDateTime'
import React from 'react'
import Link from 'next/link'

import type { BlogEntry } from '@/payload-types'

import { Media } from '@/components/Media'
import { formatAuthors } from '@/utilities/formatAuthors'

export const BlogHero: React.FC<{
  post: BlogEntry
}> = ({ post }) => {
  const { categories, heroImage, populatedAuthors, publishedAt, updatedAt, slug, title } = post

  const hasAuthors =
    populatedAuthors && populatedAuthors.length > 0 && formatAuthors(populatedAuthors) !== ''

  return (
    <div
      className={
        heroImage ? 'relative -mt-[10.4rem] flex items-end text-white' : 'relative flex items-end'
      }
    >
      <div className="container z-10 relative lg:grid lg:grid-cols-[1fr_48rem_1fr] pb-8">
        <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2">
          <div className="uppercase text-sm mb-6">
            {categories?.map((category, index) => {
              if (typeof category === 'object' && category !== null) {
                const { title: categoryTitle } = category

                const titleToUse = categoryTitle || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <React.Fragment key={index}>
                    <Link
                      className="p-category"
                      href={`/blog/category/${encodeURIComponent(category.slug || '')}`}
                    >
                      {titleToUse}
                    </Link>
                    {!isLast && <React.Fragment>, &nbsp;</React.Fragment>}
                  </React.Fragment>
                )
              }
              return null
            })}
          </div>

          <div className="">
            <h1 className="p-name mb-6 text-3xl md:text-5xl lg:text-6xl">
              <Link className="u-url" href={`/blog/${encodeURIComponent(slug || '')}`}>
                {title}
              </Link>
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-16">
            {hasAuthors && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm">Author</p>

                  <p>
                    {populatedAuthors
                      ?.filter((author) => author.name)
                      .map((author, index) => (
                        <React.Fragment key={author.id}>
                          {index > 0 && ', '}
                          <Link className="p-author h-card" href={`/blog/author/${author.id}`}>
                            <span className="p-name">{author.name}</span>
                          </Link>
                        </React.Fragment>
                      ))}
                  </p>
                </div>
              </div>
            )}
            {publishedAt && (
              <div className="flex flex-col gap-1">
                <p className="text-sm">Date Published</p>

                <Link
                  href={`/blog/archive/${new Date(publishedAt).toISOString().slice(0, 7).replace('-', '/')}`}
                >
                  <time className="dt-published" dateTime={publishedAt}>
                    {formatDateTime(publishedAt)}
                  </time>
                </Link>
              </div>
            )}
            {updatedAt && (
              <p className="text-sm">
                Updated{' '}
                <time className="dt-updated" dateTime={updatedAt}>
                  {formatDateTime(updatedAt)}
                </time>
              </p>
            )}
          </div>
        </div>
      </div>
      <div className={heroImage ? 'min-h-[80vh] select-none' : 'hidden'}>
        {heroImage && typeof heroImage !== 'string' && (
          <Media fill priority imgClassName="-z-10 object-cover" resource={heroImage} />
        )}
        <div className="absolute pointer-events-none left-0 bottom-0 w-full h-1/2 bg-linear-to-t from-black to-transparent" />
      </div>
    </div>
  )
}
