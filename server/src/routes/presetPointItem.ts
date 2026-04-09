import Router from 'koa-router'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function presetPointItemRoutes(router: Router) {
  router.get('/admin/points/preset-items', async (ctx) => {
    const { type } = ctx.query as { type?: string }
    const where: any = { isActive: true }
    if (type) where.type = type
    
    const items = await prisma.presetPointItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' }
    })
    ctx.body = { code: 0, message: 'ok', data: items }
  })

  router.post('/admin/points/preset-items', async (ctx) => {
    const { label, points, type, icon, color, sortOrder } = ctx.request.body as any
    
    if (!label || points === undefined) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'label and points are required' }
      return
    }

    const item = await prisma.presetPointItem.create({
      data: {
        label,
        points: Number(points),
        type: type || 'add',
        icon: icon || null,
        color: color || null,
        sortOrder: Number(sortOrder) || 0
      }
    })
    
    ctx.body = { code: 0, message: 'ok', data: item }
  })

  router.put('/admin/points/preset-items/:id', async (ctx) => {
    const { id } = ctx.params
    const { label, points, type, icon, color, sortOrder, isActive } = ctx.request.body as any

    const item = await prisma.presetPointItem.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(points !== undefined && { points: Number(points) }),
        ...(type !== undefined && { type }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(isActive !== undefined && { isActive })
      }
    })
    
    ctx.body = { code: 0, message: 'ok', data: item }
  })

  router.delete('/admin/points/preset-items/:id', async (ctx) => {
    const { id } = ctx.params
    
    await prisma.presetPointItem.delete({
      where: { id }
    })
    
    ctx.body = { code: 0, message: 'ok' }
  })
}