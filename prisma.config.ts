import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // Migrations need a direct (non-transaction-pooled) connection for advisory
  // locks and DDL. Falls back to DATABASE_URL if DIRECT_URL isn't set.
  datasource: { url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'] },
})
