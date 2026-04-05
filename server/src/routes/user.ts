import Router from 'koa-router'
import bcrypt from 'bcryptjs'
import { prisma } from '../utils/prisma'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

export function userRoutes(router: Router) {
  router.get('/users', authMiddleware, adminMiddleware, async (ctx) => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })
    ctx.body = { code: 0, message: 'ok', data: users }
  })

  router.get('/users/:id', authMiddleware, async (ctx) => {
    const userId = ctx.params.id
    const currentUser = ctx.state.user

    if (currentUser.userId !== userId && currentUser.role !== 'admin') {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden', data: null }
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
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

  router.post('/users', authMiddleware, adminMiddleware, async (ctx) => {
    const { username, password, role } = ctx.request.body as {
      username: string
      password: string
      role?: string
    }

    if (!username || !password) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Username and password are required', data: null }
      return
    }

    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Username already exists', data: null }
      return
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userRole = role === 'admin' ? 'admin' : 'user'

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: userRole
      },
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true
      }
    })

    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: user }
  })

  router.put('/users/:id', authMiddleware, async (ctx) => {
    const userId = ctx.params.id
    const currentUser = ctx.state.user
    const { password, role } = ctx.request.body as { password?: string; role?: string }

    if (currentUser.userId !== userId && currentUser.role !== 'admin') {
      ctx.status = 403
      ctx.body = { code: 403, message: 'Forbidden', data: null }
      return
    }

    const updateData: any = {}
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }
    if (role && currentUser.role === 'admin') {
      updateData.role = role
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    })

    ctx.body = { code: 0, message: 'ok', data: user }
  })

  router.delete('/users/:id', authMiddleware, adminMiddleware, async (ctx) => {
    const userId = ctx.params.id
    const currentUser = ctx.state.user

    if (currentUser.userId === userId) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Cannot delete yourself', data: null }
      return
    }

    await prisma.user.delete({
      where: { id: userId }
    })

    ctx.body = { code: 0, message: 'ok', data: null }
  })
}
