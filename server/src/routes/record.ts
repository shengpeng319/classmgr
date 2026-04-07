import Router from 'koa-router'
import { prisma } from '../utils/prisma'

export function recordRoutes(router: Router) {
  router.get('/records', async (ctx) => {
    const { userId, courseId, startDate, endDate } = ctx.query
    const where: any = {}
    if (userId) where.userId = userId
    if (courseId) where.courseId = courseId
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }
    const records = await prisma.record.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { user: true }
    })
    ctx.body = { code: 0, message: 'ok', data: records }
  })

  router.post('/records', async (ctx) => {
    const { userId, courseId, date, status, note, pointsEarned } = ctx.request.body as {
      userId: string
      courseId: string
      date: string
      status: string
      note?: string
      pointsEarned?: number
    }
    const record = await prisma.record.create({
      data: { userId, courseId, date: new Date(date), status, note, pointsEarned: pointsEarned || 0 }
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: record }
  })

  router.put('/records/:id', async (ctx) => {
    const data = ctx.request.body as any
    const record = await prisma.record.update({
      where: { id: ctx.params.id },
      data
    })
    ctx.body = { code: 0, message: 'ok', data: record }
  })

  router.delete('/records/:id', async (ctx) => {
    await prisma.record.delete({
      where: { id: ctx.params.id }
    })
    ctx.body = { code: 0, message: 'ok', data: null }
  })
}