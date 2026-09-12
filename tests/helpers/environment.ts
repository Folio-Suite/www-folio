// Test runners and their child server always use a disposable localhost database.
// A deployment's POSTGRES_URL and provider credentials must never become test defaults.
const databaseURL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://website_test:local-test-only@127.0.0.1:54329/folio_test'
const database = new URL(databaseURL)
if (
  !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
  !database.pathname.endsWith('_test')
) {
  throw new Error('TEST_DATABASE_URL must name a localhost database ending in _test.')
}

process.env.POSTGRES_URL = databaseURL
process.env.PAYLOAD_SECRET = 'folio-local-test-secret'
process.env.BLOB_READ_WRITE_TOKEN = ''
process.env.RESEND_API_KEY = ''
process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'

process.env.PAYLOAD_SCHEMA_PUSH = 'true'

export {}
