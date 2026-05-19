export async function createNotification({
  userId,
  workspaceId,
  type,
  title,
  body,
  triggeredById,
}: {
  userId: string
  workspaceId: string
  type: string
  title: string
  body: string
  triggeredById?: string
}) {
  try {
    await fetch('/api/notifications/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, workspaceId, type, title, body, triggeredById }),
    })
  } catch (err) {
    console.error(err)
  }
}
