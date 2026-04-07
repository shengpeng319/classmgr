import Router from 'koa-router'
import { prisma } from '../utils/prisma'
import { verifyToken, TokenPayload } from '../utils/jwt'

export function scheduleRoutes(router: Router) {
  // 获取当前用户的课程表
  router.get('/schedules', async (ctx) => {
    const authHeader = ctx.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      ctx.status = 401
      ctx.body = { code: 401, message: 'Unauthorized', data: null }
      return
    }
    
    const token = authHeader.substring(7)
    const tokenPayload = verifyToken(token)
    
    if (!tokenPayload) {
      ctx.status = 401
      ctx.body = { code: 401, message: 'Invalid token', data: null }
      return
    }
    
    const now = new Date()
    
    const schedules = await prisma.schedule.findMany({
      where: {
        userId: tokenPayload.userId,
        isActive: true,
        AND: [
          {
            OR: [
              { startDate: null },
              { startDate: { lte: now } }
            ]
          },
          {
            OR: [
              { endDate: null },
              { endDate: { gte: now } }
            ]
          }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })
    
    ctx.body = { code: 0, message: 'ok', data: schedules }
  })

  // 获取指定用户的课程表（Admin）
  router.get('/admin/schedules', async (ctx) => {
    const { userId } = ctx.query
    
    const authHeader = ctx.headers.authorization
    let isAdmin = false
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      isAdmin = payload?.role === 'admin'
    }
    
    if (!isAdmin) {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null }
      return
    }
    
    const now = new Date()
    const where: any = {
      isActive: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } }
          ]
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } }
          ]
        }
      ]
    }
    if (userId) {
      where.userId = userId as string
    }
    
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: [
        { userId: 'asc' },
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })
    
    ctx.body = { code: 0, message: 'ok', data: schedules }
  })

  // 创建课程表条目
  router.post('/admin/schedules', async (ctx) => {
    const { userId, name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, startDate, endDate } = ctx.request.body as {
      userId: string
      name: string
      dayOfWeek: string
      startTime: string
      endTime: string
      location?: string
      type: string
      color?: string
      isDailyTask?: boolean
      points?: number
      startDate?: string
      endDate?: string
    }
    
    const authHeader = ctx.headers.authorization
    let isAdmin = false
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      isAdmin = payload?.role === 'admin'
    }
    
    if (!isAdmin) {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null }
      return
    }
    
    if (!userId || !name || !dayOfWeek || !startTime || !endTime || !type) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Missing required fields', data: null }
      return
    }
    
    if (isDailyTask && (!points || points < 1)) {
      ctx.status = 400
      ctx.body = { code: 400, message: '当日任务需要设置积分值', data: null }
      return
    }
    
    const schedule = await prisma.schedule.create({
      data: {
        userId,
        name,
        dayOfWeek,
        startTime,
        endTime,
        location,
        type,
        color: color || '#87CEEB',
        isDailyTask: isDailyTask || false,
        points: points || 1,
        startDate: startDate ? new Date(startDate + 'T00:00:00.000Z') : null,
        endDate: endDate ? new Date(endDate + 'T23:59:59.999Z') : null
      }
    })
    
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: schedule }
  })

  // 更新课程表条目
  router.put('/admin/schedules/:id', async (ctx) => {
    const { id } = ctx.params
    const { name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, isActive, startDate, endDate } = ctx.request.body as {
      name?: string
      dayOfWeek?: string
      startTime?: string
      endTime?: string
      location?: string
      type?: string
      color?: string
      isDailyTask?: boolean
      points?: number
      isActive?: boolean
      startDate?: string | null
      endDate?: string | null
    }
    
    const authHeader = ctx.headers.authorization
    let isAdmin = false
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      isAdmin = payload?.role === 'admin'
    }
    
    if (!isAdmin) {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null }
      return
    }
    
    if (isDailyTask === true && (points === undefined || points < 1)) {
      ctx.status = 400
      ctx.body = { code: 400, message: '当日任务需要设置积分值', data: null }
      return
    }
    
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek
    if (startTime !== undefined) updateData.startTime = startTime
    if (endTime !== undefined) updateData.endTime = endTime
    if (location !== undefined) updateData.location = location
    if (type !== undefined) updateData.type = type
    if (color !== undefined) updateData.color = color
    if (isDailyTask !== undefined) updateData.isDailyTask = isDailyTask
    if (points !== undefined) updateData.points = points
    if (isActive !== undefined) updateData.isActive = isActive
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : null
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : null
    
    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData
    })
    
    ctx.body = { code: 0, message: 'ok', data: schedule }
  })

  // 删除课程表条目
  router.delete('/admin/schedules/:id', async (ctx) => {
    const { id } = ctx.params
    
    const authHeader = ctx.headers.authorization
    let isAdmin = false
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = verifyToken(token)
      isAdmin = payload?.role === 'admin'
    }
    
    if (!isAdmin) {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null }
      return
    }
    
    await prisma.schedule.delete({ where: { id } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })
}
