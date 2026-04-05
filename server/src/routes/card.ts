import Router from 'koa-router'
import { prisma } from '../utils/prisma'

export function cardRoutes(router: Router) {
  router.get('/cards', async (ctx) => {
    const cards = await prisma.card.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
    })
    ctx.body = { code: 0, message: 'ok', data: cards }
  })

  router.get('/cards/:id', async (ctx) => {
    const card = await prisma.card.findUnique({
      where: { id: ctx.params.id }
    })
    if (!card) {
      ctx.status = 404
      ctx.body = { code: 404, message: 'Card not found', data: null }
      return
    }
    ctx.body = { code: 0, message: 'ok', data: card }
  })

  router.post('/cards', async (ctx) => {
    const { name, description, rarity, image, pointsCost, stock } = ctx.request.body as {
      name: string
      description?: string
      rarity: string
      image?: string
      pointsCost: number
      stock?: number
    }
    const card = await prisma.card.create({
      data: { name, description, rarity, image, pointsCost, stock: stock ?? -1 }
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: card }
  })

  router.put('/cards/:id', async (ctx) => {
    const data = ctx.request.body as any
    const card = await prisma.card.update({
      where: { id: ctx.params.id },
      data
    })
    ctx.body = { code: 0, message: 'ok', data: card }
  })

  router.delete('/cards/:id', async (ctx) => {
    await prisma.card.update({
      where: { id: ctx.params.id },
      data: { isActive: false }
    })
    ctx.body = { code: 0, message: 'ok', data: null }
  })
}
