import Router from 'koa-router'
import { studentRoutes } from './student'
import { courseRoutes } from './course'
import { recordRoutes } from './record'
import { cardRoutes } from './card'
import { lotteryRoutes } from './lottery'
import { authRoutes } from './auth'
import { userRoutes } from './user'
import { profileRoutes } from './profile'

export const router = new Router({ prefix: '/api' })

// Register routes
authRoutes(router)
userRoutes(router)
profileRoutes(router)
studentRoutes(router)
courseRoutes(router)
recordRoutes(router)
cardRoutes(router)
lotteryRoutes(router)
