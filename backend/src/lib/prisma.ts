import { PrismaPg } from '@prisma/adapter-pg'
import PrismaClient from '@prisma/client'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClient> }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter } as any)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
