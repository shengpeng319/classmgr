import Router from 'koa-router'
import { prisma } from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'

export function profileRoutes(router: Router) {
  router.put('/profile', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId
    const { name, avatar, gender, age, phone } = ctx.request.body as {
      name?: string
      avatar?: string
      gender?: string
      age?: number
      phone?: string
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (avatar !== undefined) updateData.avatar = avatar
    if (gender !== undefined) updateData.gender = gender
    if (age !== undefined) updateData.age = age
    if (phone !== undefined) updateData.phone = phone

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        avatar: true,
        gender: true,
        age: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    })

    ctx.body = { code: 0, message: 'ok', data: user }
  })

  router.get('/profile', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        name: true,
        avatar: true,
        gender: true,
        age: true,
        phone: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      ctx.status = 404
      ctx.body = { code: 404, message: 'User not found', data: null }
      return
    }

    ctx.body = { code: 0, message: 'ok', data: user }
  })
}
