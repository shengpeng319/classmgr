import Router from 'koa-router'
import { courseRoutes } from './course'
import { recordRoutes } from './record'
import { cardRoutes } from './card'
import { lotteryRoutes } from './lottery'
import { authRoutes } from './auth'
import { userRoutes } from './user'
import { profileRoutes } from './profile'
import { taskRoutes } from './task'
import { scheduleRoutes } from './schedule'

export const router = new Router({ prefix: '/api' })

// Register routes
authRoutes(router)
userRoutes(router)
profileRoutes(router)
courseRoutes(router)
recordRoutes(router)
cardRoutes(router)
lotteryRoutes(router)
taskRoutes(router)
scheduleRoutes(router)
