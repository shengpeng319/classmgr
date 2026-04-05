import Router from 'koa-router'
import { prisma } from '../utils/prisma'

export function courseRoutes(router: Router) {
  router.get('/courses', async (ctx) => {
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      orderBy: { dayOfWeek: 'asc' }
    })
    ctx.body = { code: 0, message: 'ok', data: courses }
  })

  router.get('/courses/:id', async (ctx) => {
    const course = await prisma.course.findUnique({
      where: { id: ctx.params.id }
    })
    if (!course) {
      ctx.status = 404
      ctx.body = { code: 404, message: 'Course not found', data: null }
      return
    }
    ctx.body = { code: 0, message: 'ok', data: course }
  })

  router.post('/courses', async (ctx) => {
    const { name, description, color, dayOfWeek, startTime, endTime, location } = ctx.request.body as {
      name: string
      description?: string
      color?: string
      dayOfWeek: number
      startTime: string
      endTime: string
      location?: string
    }
    const course = await prisma.course.create({
      data: { name, description, color, dayOfWeek, startTime, endTime, location }
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: course }
  })

  router.put('/courses/:id', async (ctx) => {
    const data = ctx.request.body as any
    const course = await prisma.course.update({
      where: { id: ctx.params.id },
      data
    })
    ctx.body = { code: 0, message: 'ok', data: course }
  })

  router.delete('/courses/:id', async (ctx) => {
    await prisma.course.update({
      where: { id: ctx.params.id },
      data: { isActive: false }
    })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  router.get('/today-courses', async (ctx) => {
    const dayOfWeek = new Date().getDay()
    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        dayOfWeek
      },
      orderBy: { startTime: 'asc' }
    })
    ctx.body = { code: 0, message: 'ok', data: courses }
  })
}
