import Router from 'koa-router'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '../utils/prisma'
import { generateToken } from '../utils/jwt'

function generateRememberToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function authRoutes(router: Router) {
  router.post('/auth/register', async (ctx) => {
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
      }
    })

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    ctx.status = 201
    ctx.body = {
      code: 0,
      message: 'ok',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          avatar: user.avatar
        }
      }
    }
  })

  router.post('/auth/login', async (ctx) => {
    const { username, password, deviceId, remember } = ctx.request.body as {
      username: string
      password: string
      deviceId?: string
      remember?: boolean
    }

    if (!username || !password) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Username and password are required', data: null }
      return
    }

    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      ctx.status = 401
      ctx.body = { code: 401, message: 'Invalid username or password', data: null }
      return
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      ctx.status = 401
      ctx.body = { code: 401, message: 'Invalid username or password', data: null }
      return
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    const responseData: any = {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
        avatar: user.avatar
      }
    }

    if (remember && deviceId) {
      const rememberToken = generateRememberToken()
      
      await prisma.rememberedUser.upsert({
        where: {
          userId_deviceId: {
            userId: user.id,
            deviceId
          }
        },
        update: {
          rememberToken
        },
        create: {
          userId: user.id,
          deviceId,
          rememberToken
        }
      })
      
      responseData.rememberToken = rememberToken
    }

    ctx.body = {
      code: 0,
      message: 'ok',
      data: responseData
    }
  })

  router.post('/auth/quick-login', async (ctx) => {
    const { rememberToken, deviceId } = ctx.request.body as {
      rememberToken: string
      deviceId: string
    }

    if (!rememberToken || !deviceId) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Missing remember token or device ID', data: null }
      return
    }

    const remembered = await prisma.rememberedUser.findUnique({
      where: {
        userId_deviceId: {
          userId: '', // placeholder
          deviceId
        }
      },
      include: { user: true }
    })

    const found = await prisma.rememberedUser.findFirst({
      where: {
        rememberToken,
        deviceId
      },
      include: { user: true }
    })

    if (!found || !found.user) {
      ctx.status = 401
      ctx.body = { code: 401, message: 'Invalid remember token', data: null }
      return
    }

    const user = found.user
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    })

    ctx.body = {
      code: 0,
      message: 'ok',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          avatar: user.avatar
        }
      }
    }
  })

  router.get('/auth/remembered-users/:deviceId', async (ctx) => {
    const { deviceId } = ctx.params

    const remembered = await prisma.rememberedUser.findMany({
      where: { deviceId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    ctx.body = {
      code: 0,
      message: 'ok',
      data: remembered.map(r => r.user)
    }
  })

  router.delete('/auth/remembered-user/:userId', async (ctx) => {
    const { userId } = ctx.params
    const { deviceId } = ctx.query as { deviceId: string }

    if (!deviceId) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Missing device ID', data: null }
      return
    }

    await prisma.rememberedUser.deleteMany({
      where: {
        userId,
        deviceId
      }
    })

    ctx.body = { code: 0, message: 'ok', data: null }
  })
}
