import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { env } from './config/env'
import { initSocket } from './socket'
import { authRouter } from './routes/auth'
import { workspacesRouter } from './routes/workspaces'
import { tasksRouter } from './routes/tasks'
import { filesRouter } from './routes/files'
import { meetingsRouter } from './routes/meetings'
import { messagesRouter } from './routes/messages'

const app = express()
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
})

initSocket(io)

app.use(cors({ origin: env.FRONTEND_URL }))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok', app: 'GradFlow API' }))

app.use('/api/auth',                             authRouter)
app.use('/api/workspaces',                       workspacesRouter)
app.use('/api/workspaces/:workspaceId/tasks',    tasksRouter)
app.use('/api/workspaces/:workspaceId/files',    filesRouter)
app.use('/api/workspaces/:workspaceId/meetings', meetingsRouter)
app.use('/api/workspaces/:workspaceId/messages', messagesRouter)

const PORT = process.env.PORT || 4000

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`GradFlow API running on port ${PORT}`)
  console.log(`Socket.io ready`)
})

export default app
