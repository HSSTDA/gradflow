export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET:   process.env.JWT_SECRET   ?? 'dev-secret-change-in-prod',
  PORT:         process.env.PORT         ?? '4000',
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  NODE_ENV:     process.env.NODE_ENV     ?? 'development',
}
