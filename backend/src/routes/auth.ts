import { Router } from 'express'
import { signup, login, me } from '../controllers/auth'
import { verifyToken } from '../middleware/auth'

export const authRouter = Router()

authRouter.post('/signup', signup)
authRouter.post('/login',  login)
authRouter.get('/me',      verifyToken, me)
