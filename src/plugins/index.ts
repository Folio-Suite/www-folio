import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, BlogEntry } from '@/payload-types'
import { reserveRedirectPath } from '@/sites/reservations'
import { siteField } from '@/sites/fields'
import { siteName } from '@/utilities/site'
import { getDocumentURL } from '@/utilities/getDocumentURL'

const generateTitle: GenerateTitle<BlogEntry | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | ${siteName}` : siteName
}

const generateURL: GenerateURL<BlogEntry | Page> = ({ doc, collectionConfig, collectionSlug }) =>
  getDocumentURL(
    (collectionConfig?.slug || collectionSlug) === 'blog' ? 'blog' : 'pages',
    doc?.slug,
    doc && 'site' in doc ? doc.site : undefined,
  )

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'blog'],
    overrides: {
      fields: ({ defaultFields }) => {
        return [
          siteField,
          ...defaultFields.map((field) => {
            if (field.type === 'text' && field.name === 'from') {
              return {
                ...field,
                unique: false,
                admin: {
                  description: 'A source path reserved on the selected destination site.',
                },
              }
            }
            return field
          }),
        ]
      },
      indexes: [{ fields: ['site', 'from'], unique: true }],
      hooks: {
        afterChange: [revalidateRedirects],
        beforeChange: [reserveRedirectPath],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['blog'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]
