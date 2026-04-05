import Router from 'koa-router'
import { prisma } from '../utils/prisma'

export function studentRoutes(router: Router) {
  router.get('/students', async (ctx) => {
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'desc' }
    })
    ctx.body = { code: 0, message: 'ok', data: students }
  })

  router.get('/students/:id', async (ctx) => {
    const student = await prisma.student.findUnique({
      where: { id: ctx.params.id }
    })
    if (!student) {
      ctx.status = 404
      ctx.body = { code: 404, message: 'Student not found', data: null }
      return
    }
    ctx.body = { code: 0, message: 'ok', data: student }
  })

  router.post('/students', async (ctx) => {
    const { name, avatar } = ctx.request.body as { name: string; avatar?: string }
    const student = await prisma.student.create({
      data: { name, avatar }
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: student }
  })

  router.put('/students/:id', async (ctx) => {
    const { name, avatar, points } = ctx.request.body as { name?: string; avatar?: string; points?: number }
    const student = await prisma.student.update({
      where: { id: ctx.params.id },
      data: { name, avatar, points }
    })
    ctx.body = { code: 0, message: 'ok', data: student }
  })

  router.delete('/students/:id', async (ctx) => {
    await prisma.student.delete({
      where: { id: ctx.params.id }
    })
    ctx.body = { code: 0, message: 'ok', data: null }
  })
}
