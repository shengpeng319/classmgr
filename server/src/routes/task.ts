import Router from 'koa-router'
import { prisma } from '../utils/prisma'
import { verifyToken, TokenPayload } from '../utils/jwt'

export function taskRoutes(router: Router) {
  router.get('/tasks', async (ctx) => {
    const { userId, startDate, endDate } = ctx.query
    
    const authHeader = ctx.headers.authorization
    let tokenPayload: TokenPayload | null = null
    let isAdmin = false
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      tokenPayload = verifyToken(token)
      isAdmin = tokenPayload?.role === 'admin'
    }
    
    const where: any = {}
    
    if (isAdmin && userId) {
      where.userId = userId as string
    } else if (isAdmin) {
      // Admin without userId gets all tasks - no userId filter
    } else if (tokenPayload) {
      // Regular user gets only their own tasks
      where.userId = tokenPayload.userId
    } else {
      ctx.status = 400
      ctx.body = { code: 400, message: 'userId is required', data: null }
      return
    }
    
    if (startDate && endDate) {
      const qStart = new Date(startDate as string + 'T00:00:00.000Z')
      const qEnd = new Date(endDate as string + 'T23:59:59.999Z')
      where.OR = [
        { startDate: { gte: qStart, lte: qEnd } },
        { endDate: { gte: qStart, lte: qEnd } },
        { AND: [{ startDate: { lte: qStart } }, { endDate: { gte: qEnd } }] }
      ]
    } else if (startDate) {
      where.startDate = { gte: new Date(startDate as string + 'T00:00:00.000Z') }
    } else if (endDate) {
      where.endDate = { lte: new Date(endDate as string + 'T23:59:59.999Z') }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
    })
    ctx.body = { code: 0, message: 'ok', data: tasks }
  })

  router.put('/tasks/:id', async (ctx) => {
    const { id } = ctx.params
    const { isCompleted } = ctx.request.body as { isCompleted: boolean }
    
    const task = await prisma.task.update({
      where: { id },
      data: {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    })
    ctx.body = { code: 0, message: 'ok', data: task }
  })

  router.post('/tasks/init', async (ctx) => {
    const { userId, tasks } = ctx.request.body as {
      userId: string
      tasks: Array<{ title: string; type: string; startDate: string; endDate: string }>
    }
    
    if (!userId) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'userId is required', data: null }
      return
    }
    
    const existingTasks = await prisma.task.count({
      where: { userId }
    })
    
    if (existingTasks > 0) {
      ctx.body = { code: 0, message: 'Tasks already initialized', data: null }
      return
    }
    
    const createdTasks = await prisma.task.createMany({
      data: tasks.map(t => ({
        title: t.title,
        type: t.type,
        userId,
        startDate: new Date(t.startDate + 'T00:00:00.000Z'),
        endDate: new Date(t.endDate + 'T23:59:59.999Z'),
        isCompleted: false
      }))
    })
    
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: createdTasks }
  })

  // Admin routes
  router.get('/admin/tasks', async (ctx) => {
    const { userId, startDate, endDate } = ctx.query
    
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
    
    const where: any = {}
    
    if (userId) {
      where.userId = userId as string
    }
    
    if (startDate && endDate) {
      const qStart = new Date(startDate as string + 'T00:00:00.000Z')
      const qEnd = new Date(endDate as string + 'T23:59:59.999Z')
      where.OR = [
        { startDate: { gte: qStart, lte: qEnd } },
        { endDate: { gte: qStart, lte: qEnd } },
        { AND: [{ startDate: { lte: qStart } }, { endDate: { gte: qEnd } }] }
      ]
    } else if (startDate) {
      where.startDate = { gte: new Date(startDate as string + 'T00:00:00.000Z') }
    } else if (endDate) {
      where.endDate = { lte: new Date(endDate as string + 'T23:59:59.999Z') }
    }
    
    const tasks = await prisma.task.findMany({
      where,
      orderBy: { startDate: 'desc' },
      include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
    })
    ctx.body = { code: 0, message: 'ok', data: tasks }
  })

  router.post('/admin/tasks', async (ctx) => {
    const { userId, title, type, points, startDate, endDate } = ctx.request.body as {
      userId: string
      title: string
      type: string
      points?: number
      startDate: string
      endDate: string
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
    
    if (!userId || !title || !type || !startDate || !endDate) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Missing required fields', data: null }
      return
    }
    
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        type,
        points: Number(points) || 5,
        startDate: new Date(startDate + 'T00:00:00.000Z'),
        endDate: new Date(endDate + 'T23:59:59.999Z'),
        isCompleted: false
      },
      include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
    })
    
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: task }
  })

  router.put('/admin/tasks/:id', async (ctx) => {
    const { id } = ctx.params
    const { title, type, points, startDate, endDate, isCompleted } = ctx.request.body as {
      title?: string
      type?: string
      points?: number
      startDate?: string
      endDate?: string
      isCompleted?: boolean
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
    
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (type !== undefined) updateData.type = type
    if (points !== undefined) updateData.points = Number(points)
    if (startDate !== undefined) updateData.startDate = new Date(startDate + 'T00:00:00.000Z')
    if (endDate !== undefined) updateData.endDate = new Date(endDate + 'T23:59:59.999Z')
    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      updateData.completedAt = isCompleted ? new Date() : null
    }
    
    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
    })
    
    ctx.body = { code: 0, message: 'ok', data: task }
  })

  router.delete('/admin/tasks/:id', async (ctx) => {
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
    
    await prisma.task.delete({ where: { id } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })
}