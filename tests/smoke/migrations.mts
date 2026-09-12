import assert from 'node:assert/strict'
import { pbkdf2Sync, randomBytes } from 'node:crypto'

if (!process.env.TEST_DATABASE_URL?.endsWith('/folio_migrations_test')) {
  throw new Error('Set TEST_DATABASE_URL to an empty localhost folio_migrations_test database.')
}
await import('../helpers/environment.js')
process.env.PAYLOAD_SCHEMA_PUSH = 'false'

const { getPayload, readMigrationFiles } = await import('payload')
const { sql } = await import('@payloadcms/db-vercel-postgres')
const { default: config } = await import('../../src/payload.config.js')
const payload = await getPayload({ config })
const migrations = await readMigrationFiles({ payload })

try {
  const tables = await payload.db.drizzle.execute(sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `)
  assert.equal(tables.rows.length, 0, 'Migration smoke test requires an empty database.')

  // Start with the real template schema, then preserve a pre-existing administrator.
  await payload.db.migrate({ migrations: migrations.slice(0, 1) })
  const email = 'migration-admin@example.test'
  const password = 'local-migration-test-only'
  const salt = randomBytes(32).toString('hex')
  const hash = pbkdf2Sync(password, salt, 25000, 512, 'sha256').toString('hex')
  await payload.db.drizzle.execute(sql`
    INSERT INTO users (name, email, salt, hash)
    VALUES ('Existing Folio Administrator', ${email}, ${salt}, ${hash})
  `)

  await payload.db.migrate({ migrations })
  const result = await payload.login({ collection: 'users', data: { email, password } })
  assert.ok(result.user)
  assert.equal(result.user.name, 'Existing Folio Administrator')
  assert.ok(result.token)
  const blog = await payload.find({ collection: 'blog' })
  assert.equal(blog.totalDocs, 0)
  const media = await payload.find({ collection: 'media' })
  assert.equal(media.totalDocs, 0)
  await payload.db.migrate({ migrations })
  const history = await payload.find({ collection: 'payload-migrations', limit: 100 })
  assert.equal(history.totalDocs, migrations.length)
  console.log('PASS: fresh schema, upgrade, preserved admin login, empty content, migration rerun.')
} finally {
  await payload.destroy()
}
