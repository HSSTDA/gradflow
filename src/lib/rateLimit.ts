const requests = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(identifier: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now()
  const record = requests.get(identifier)

  if (!record || now > record.resetTime) {
    requests.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}
