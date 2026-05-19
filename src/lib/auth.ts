import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gradflow-secret'

export const signToken = (userId: string, email: string) =>
  jwt.sign(
    { userId, email, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    {
      expiresIn: '7d',
      issuer: 'gradflow',
      audience: 'gradflow-app',
    }
  )

export const verifyToken = (token: string): { userId: string; email: string } => {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'gradflow',
      audience: 'gradflow-app',
    }) as { userId: string; email: string }
  } catch {
    throw new Error('Invalid or expired token')
  }
}
