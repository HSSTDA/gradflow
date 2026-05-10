import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gradflow-secret'

export const signToken = (userId: string, email: string) =>
  jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' })

export const verifyToken = (token: string) =>
  jwt.verify(token, JWT_SECRET) as { userId: string; email: string }
