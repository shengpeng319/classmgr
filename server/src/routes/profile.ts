import Router from 'koa-router'
import { prisma } from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'
import * as fs from 'fs'
import * as path from 'path'

const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars')

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

export function profileRoutes(router: Router) {
  router.post('/profile/avatar', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId
    const { avatar } = ctx.request.body as { avatar?: string }

    if (!avatar || !avatar.startsWith('data:image')) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'Invalid avatar data', data: null }
      return
    }

    ensureUploadDir()

    const base64Data = avatar.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const filename = `${userId}_${Date.now()}.jpg`
    const filepath = path.join(UPLOAD_DIR, filename)

    fs.writeFileSync(filepath, buffer)

    const avatarUrl = `/uploads/avatars/${filename}`

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl }
    })

    ctx.body = { code: 0, message: 'ok', data: { avatar: avatarUrl } }
  })

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
    if (avatar !== undefined && !avatar.startsWith('data:image')) updateData.avatar = avatar
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
