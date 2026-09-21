// 批2 v2 接口：多家庭路由。所有 v2 路由挂 familyScope 做家庭隔离。
import Router from 'koa-router'
import bcrypt from 'bcryptjs'
import { Context, Next } from 'koa'
import { prisma } from '../utils/prisma'
import { generateToken, verifyToken, TokenPayload } from '../utils/jwt'
import { authMiddleware } from '../middleware/auth'
import { codeToOpenid } from '../services/wxNotice'

// ---------- familyScope：JWT → user → familyId → ctx.state.family ----------
export const familyScope = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Unauthorized: No token provided', data: null }
    return
  }
  const payload = verifyToken(authHeader.substring(7))
  if (!payload) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Unauthorized: Invalid token', data: null }
    return
  }
  ctx.state.user = payload
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user || !user.familyId) {
    ctx.status = 403
    ctx.body = { code: 403, message: '账号未绑定家庭', data: null }
    return
  }
  // admin 可通过 ?familyId= 查任意家庭
  const qFamilyId = (ctx.query as any).familyId as string | undefined
  const familyId =
    user.role === 'admin' && qFamilyId ? qFamilyId : user.familyId
  const family = await prisma.family.findUnique({ where: { id: familyId } })
  if (!family) {
    ctx.status = 403
    ctx.body = { code: 403, message: '家庭不存在', data: null }
    return
  }
  ctx.state.family = family
  ctx.state.familyUser = user
  await next()
}

// 校验 child 属于当前家庭；返回 child 或 null（已写响应）
export async function childInScope(ctx: Context, childId: string) {
  if (!childId) {
    ctx.status = 400
    ctx.body = { code: 400, message: 'childId 必填', data: null }
    return null
  }
  const family = ctx.state.family
  const child = await prisma.child.findFirst({
    where: { id: childId, familyId: family.id },
  })
  if (!child) {
    ctx.status = 403
    ctx.body = { code: 403, message: '孩子不存在或不属于当前家庭', data: null }
    return null
  }
  return child
}

export function v2Routes(router: Router) {
  // ---------- 注册（开放，不走 familyScope）----------
  router.post('/v2/auth/register', async (ctx) => {
    const { username, password, name, inviteCode } = ctx.request.body as {
      username: string
      password: string
      name?: string
      inviteCode?: string
    }
    if (!username || !password) {
      ctx.status = 400
      ctx.body = { code: 400, message: '用户名和密码必填', data: null }
      return
    }
    const exists = await prisma.user.findUnique({ where: { username } })
    if (exists) {
      ctx.status = 400
      ctx.body = { code: 400, message: '用户名已存在', data: null }
      return
    }
    const hashed = await bcrypt.hash(password, 10)
    let family
    if (inviteCode && inviteCode.trim()) {
      family = await prisma.family.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } })
      if (!family) {
        ctx.status = 400
        ctx.body = { code: 400, message: '邀请码无效', data: null }
        return
      }
    } else {
      family = await prisma.family.create({
        data: { name: name ? `${name}家` : `${username}家`, inviteCode: genInviteCode() },
      })
    }
    const user = await prisma.user.create({
      data: {
        username,
        password: hashed,
        role: 'parent',
        name: name || username,
        familyId: family.id,
      },
    })
    ctx.status = 201
    ctx.body = {
      code: 0,
      message: 'ok',
      data: {
        token: generateToken({ userId: user.id, username: user.username, role: user.role }),
        user: { id: user.id, username: user.username, role: user.role, name: user.name, familyId: family.id },
      },
    }
  })

  // ---------- 以下全部走 familyScope ----------
  // 当前家庭 + children 列表
  router.get('/v2/family', familyScope, async (ctx) => {
    const family = ctx.state.family
    const children = await prisma.child.findMany({
      where: { familyId: family.id },
      orderBy: { createdAt: 'asc' },
    })
    const members = await prisma.user.findMany({
      where: { familyId: family.id },
      select: { id: true, username: true, name: true, avatar: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    ctx.body = { code: 0, message: 'ok', data: { family, children, members } }
  })

  // 改家庭名（本家庭成员均可）
  router.patch('/v2/family', familyScope, async (ctx) => {
    const { name } = ctx.request.body as { name?: string }
    const trimmed = (name || '').trim()
    if (!trimmed) {
      ctx.status = 400
      ctx.body = { code: 400, message: '家庭名不能为空', data: null }
      return
    }
    const family = await prisma.family.update({ where: { id: ctx.state.family.id }, data: { name: trimmed } })
    ctx.body = { code: 0, message: 'ok', data: { family } }
  })

  // 上报订阅授权：wx.login code + requestSubscribeMessage accept 次数
  router.post('/v2/notify/subscribe', authMiddleware, async (ctx) => {
    const userId = (ctx.state.user as TokenPayload).userId as string
    const { code, quota } = ctx.request.body as { code?: string; quota?: number }
    const data: any = {}
    if (code) {
      const openid = await codeToOpenid(code)
      if (openid) data.openid = openid
    }
    if (quota && quota > 0) data.msgQuota = { increment: Math.min(quota, 10) }
    if (Object.keys(data).length === 0) { ctx.body = { code: 0, message: 'nothing to update', data: null }; return }
    await prisma.user.update({ where: { id: userId }, data })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // 上课提醒设置（开关+提前分钟）
  router.post('/v2/notify/settings', authMiddleware, async (ctx) => {
    const userId = (ctx.state.user as TokenPayload).userId as string
    const { enabled, remindMinutes } = ctx.request.body as { enabled?: boolean; remindMinutes?: number }
    const data: any = {}
    if (typeof enabled === 'boolean') data.notifyEnabled = enabled
    if (typeof remindMinutes === 'number' && remindMinutes >= 5 && remindMinutes <= 120) data.remindMinutes = Math.round(remindMinutes)
    await prisma.user.update({ where: { id: userId }, data })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // 加入家庭（无家庭用户，填邀请码）
  router.post('/v2/family/join', authMiddleware, async (ctx) => {
    const userId = (ctx.state.user as TokenPayload).userId as string
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me) { ctx.status = 401; ctx.body = { code: 401, message: '用户不存在', data: null }; return }
    if (me.familyId) { ctx.status = 400; ctx.body = { code: 400, message: '你已在家庭中，请先退出当前家庭', data: null }; return }
    const { inviteCode } = ctx.request.body as { inviteCode?: string }
    if (!inviteCode?.trim()) { ctx.status = 400; ctx.body = { code: 400, message: '请输入邀请码', data: null }; return }
    const fam = await prisma.family.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } })
    if (!fam) { ctx.status = 400; ctx.body = { code: 400, message: '邀请码无效', data: null }; return }
    await prisma.user.update({ where: { id: userId }, data: { familyId: fam.id } })
    ctx.body = { code: 0, message: 'ok', data: { familyId: fam.id, familyName: fam.name } }
  })

  // 退出家庭（家长均可；最后一个成员退出后家庭保留数据）
  router.post('/v2/family/leave', authMiddleware, async (ctx) => {
    const userId = (ctx.state.user as TokenPayload).userId as string
    const me = await prisma.user.findUnique({ where: { id: userId } })
    if (!me?.familyId) { ctx.status = 400; ctx.body = { code: 400, message: '你不在任何家庭中', data: null }; return }
    await prisma.user.update({ where: { id: userId }, data: { familyId: null } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // 移除其他家庭成员
  router.post('/v2/family/kick', familyScope, async (ctx) => {
    const me = ctx.state.user
    const { userId } = ctx.request.body as { userId?: string }
    if (!userId) { ctx.status = 400; ctx.body = { code: 400, message: '缺少 userId', data: null }; return }
    if (userId === me.userId) { ctx.status = 400; ctx.body = { code: 400, message: '不能移除自己，请用退出家庭', data: null }; return }
    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target || target.familyId !== ctx.state.family.id) { ctx.status = 400; ctx.body = { code: 400, message: '该用户不在本家庭', data: null }; return }
    await prisma.user.update({ where: { id: userId }, data: { familyId: null } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // 重新生成邀请码
  router.post('/v2/family/invite-code', familyScope, async (ctx) => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
    try {
      const family = await prisma.family.update({ where: { id: ctx.state.family.id }, data: { inviteCode: code } })
      ctx.body = { code: 0, message: 'ok', data: { inviteCode: family.inviteCode } }
    } catch (e: any) {
      if (e?.code === 'P2002') {
        ctx.body = { code: 0, message: 'ok', data: { inviteCode: (ctx.state.family as any).inviteCode } }
        return
      }
      throw e
    }
  })

  // ---------- children CRUD ----------
  router.get('/v2/children', familyScope, async (ctx) => {
    const children = await prisma.child.findMany({
      where: { familyId: ctx.state.family.id },
      orderBy: { createdAt: 'asc' },
    })
    ctx.body = { code: 0, message: 'ok', data: children }
  })

  router.post('/v2/children', familyScope, async (ctx) => {
    const { name, gender, age, avatar } = ctx.request.body as { name: string; gender?: string; age?: number; avatar?: string }
    if (!name) {
      ctx.status = 400
      ctx.body = { code: 400, message: '孩子姓名必填', data: null }
      return
    }
    const child = await prisma.child.create({
      data: { familyId: ctx.state.family.id, name, gender: gender || 'male', age: age ?? null, avatar },
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: child }
  })

  router.patch('/v2/children/:id', familyScope, async (ctx) => {
    const child = await childInScope(ctx, ctx.params.id)
    if (!child) return
    const { name, gender, age, avatar, isActive } = ctx.request.body as any
    const updated = await prisma.child.update({
      where: { id: child.id },
      data: { ...(name !== undefined && { name }), ...(gender !== undefined && { gender }), ...(age !== undefined && { age }), ...(avatar !== undefined && { avatar }), ...(isActive !== undefined && { isActive }) },
    })
    ctx.body = { code: 0, message: 'ok', data: updated }
  })

  router.delete('/v2/children/:id', familyScope, async (ctx) => {
    const child = await childInScope(ctx, ctx.params.id)
    if (!child) return
    const inUse =
      (await prisma.task.count({ where: { childId: child.id } })) +
      (await prisma.schedule.count({ where: { childId: child.id } }))
    if (inUse > 0) {
      // 软删：有业务数据的孩子只停用
      await prisma.child.update({ where: { id: child.id }, data: { isActive: false } })
      ctx.body = { code: 0, message: '孩子有课程/任务数据，已停用（软删除）', data: { id: child.id, isActive: false } }
      return
    }
    await prisma.child.delete({ where: { id: child.id } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // ---------- tasks ----------
  router.get('/v2/tasks', familyScope, async (ctx) => {
    const { childId, date, startDate, endDate } = ctx.query as any
    const where: any = { child: { familyId: ctx.state.family.id } }
    if (childId) {
      const child = await childInScope(ctx, childId)
      if (!child) return
      where.childId = child.id
    }
    if (date) {
      const d = new Date(`${date}T00:00:00+08:00`)
      const next = new Date(d)
      next.setDate(next.getDate() + 1)
      where.startDate = { lte: next }
      where.endDate = { gte: d }
    } else if (startDate && endDate) {
      where.startDate = { lte: new Date(`${endDate}T23:59:59+08:00`) }
      where.endDate = { gte: new Date(`${startDate}T00:00:00+08:00`) }
    }
    const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' }, include: { child: { select: { id: true, name: true } } } })
    ctx.body = { code: 0, message: 'ok', data: tasks }
  })

  router.post('/v2/tasks', familyScope, async (ctx) => {
    const { title, type, points, childId, startDate, endDate } = ctx.request.body as any
    const child = await childInScope(ctx, childId)
    if (!child) return
    if (!title || !startDate || !endDate) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'title/startDate/endDate 必填', data: null }
      return
    }
    const adminUser = ctx.state.familyUser
    const task = await prisma.task.create({
      data: {
        title, type: type || 'other', points: points ?? 5,
        childId: child.id, userId: adminUser.id,
        startDate: new Date(startDate), endDate: new Date(endDate),
      },
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: task }
  })

  router.patch('/v2/tasks/:id', familyScope, async (ctx) => {
    const task = await prisma.task.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } })
    if (!task) {
      ctx.status = 404
      ctx.body = { code: 404, message: '任务不存在', data: null }
      return
    }
    const { isCompleted, title, points } = ctx.request.body as any
    const data: any = {}
    if (isCompleted !== undefined) {
      data.isCompleted = isCompleted
      data.completedAt = isCompleted ? new Date() : null
      // 积分联动：完成加分/取消扣分（与旧接口一致）
      if (isCompleted && !task.isCompleted) {
        await prisma.$transaction([
          prisma.child.update({ where: { id: task.childId! }, data: { points: { increment: task.points } } }),
          prisma.pointRecord.create({ data: { childId: task.childId!, userId: ctx.state.familyUser.id, taskId: task.id, taskTitle: task.title, points: task.points, reason: '完成任务' } }),
        ])
      } else if (!isCompleted && task.isCompleted) {
        await prisma.$transaction([
          prisma.child.update({ where: { id: task.childId! }, data: { points: { decrement: task.points } } }),
          prisma.pointRecord.create({ data: { childId: task.childId!, userId: ctx.state.familyUser.id, taskId: task.id, taskTitle: task.title, points: -task.points, reason: '取消完成' } }),
        ])
      }
    }
    if (title !== undefined) data.title = title
    if (points !== undefined) data.points = points
    const updated = await prisma.task.update({ where: { id: task.id }, data })
    ctx.body = { code: 0, message: 'ok', data: updated }
  })

  router.delete('/v2/tasks/:id', familyScope, async (ctx) => {
    const task = await prisma.task.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } })
    if (!task) {
      ctx.status = 404
      ctx.body = { code: 404, message: '任务不存在', data: null }
      return
    }
    await prisma.task.delete({ where: { id: task.id } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // ---------- schedules ----------
  router.get('/v2/schedules', familyScope, async (ctx) => {
    const { childId } = ctx.query as any
    const where: any = { child: { familyId: ctx.state.family.id }, isActive: true }
    if (childId) {
      const child = await childInScope(ctx, childId)
      if (!child) return
      where.childId = child.id
    }
    const schedules = await prisma.schedule.findMany({ where, orderBy: { createdAt: 'asc' }, include: { child: { select: { id: true, name: true } } } })
    ctx.body = { code: 0, message: 'ok', data: schedules }
  })

  router.post('/v2/schedules', familyScope, async (ctx) => {
    const { name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, childId, startDate, endDate } = ctx.request.body as any
    const child = await childInScope(ctx, childId)
    if (!child) return
    if (!name || !dayOfWeek || !startTime || !endTime) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'name/dayOfWeek/startTime/endTime 必填', data: null }
      return
    }
    const adminUser = ctx.state.familyUser
    const schedule = await prisma.schedule.create({
      data: {
        name, dayOfWeek, startTime, endTime,
        location, type: type || 'other', color, isDailyTask: !!isDailyTask, points: points ?? 1,
        childId: child.id, userId: adminUser.id,
        ...(startDate ? { startDate: new Date(startDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    })
    ctx.status = 201
    ctx.body = { code: 0, message: 'ok', data: schedule }
  })

  router.patch('/v2/schedules/:id', familyScope, async (ctx) => {
    const schedule = await prisma.schedule.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } })
    if (!schedule) {
      ctx.status = 404
      ctx.body = { code: 404, message: '课程不存在', data: null }
      return
    }
    const b = ctx.request.body as any
    const updated = await prisma.schedule.update({
      where: { id: schedule.id },
      data: {
        ...(b.name !== undefined && { name: b.name }),
        ...(b.dayOfWeek !== undefined && { dayOfWeek: b.dayOfWeek }),
        ...(b.startTime !== undefined && { startTime: b.startTime }),
        ...(b.endTime !== undefined && { endTime: b.endTime }),
        ...(b.location !== undefined && { location: b.location }),
        ...(b.type !== undefined && { type: b.type }),
        ...(b.color !== undefined && { color: b.color }),
        ...(b.isDailyTask !== undefined && { isDailyTask: b.isDailyTask }),
        ...(b.points !== undefined && { points: b.points }),
        ...(b.isActive !== undefined && { isActive: b.isActive }),
        ...(b.startDate !== undefined && { startDate: b.startDate ? new Date(b.startDate) : null }),
        ...(b.endDate !== undefined && { endDate: b.endDate ? new Date(b.endDate) : null }),
      },
    })
    ctx.body = { code: 0, message: 'ok', data: updated }
  })

  router.delete('/v2/schedules/:id', familyScope, async (ctx) => {
    const schedule = await prisma.schedule.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } })
    if (!schedule) {
      ctx.status = 404
      ctx.body = { code: 404, message: '课程不存在', data: null }
      return
    }
    await prisma.schedule.delete({ where: { id: schedule.id } })
    ctx.body = { code: 0, message: 'ok', data: null }
  })

  // ---------- 积分 ----------
  router.get('/v2/children/:id/points', familyScope, async (ctx) => {
    const child = await childInScope(ctx, ctx.params.id)
    if (!child) return
    const records = await prisma.pointRecord.findMany({
      where: { childId: child.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    ctx.body = { code: 0, message: 'ok', data: { points: child.points, records } }
  })

  router.post('/v2/children/:id/points', familyScope, async (ctx) => {
    const child = await childInScope(ctx, ctx.params.id)
    if (!child) return
    const { points, reason } = ctx.request.body as { points: number; reason?: string }
    if (!points || !reason) {
      ctx.status = 400
      ctx.body = { code: 400, message: 'points/reason 必填', data: null }
      return
    }
    const [updated] = await prisma.$transaction([
      prisma.child.update({ where: { id: child.id }, data: { points: { increment: points } } }),
      prisma.pointRecord.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, taskTitle: reason, points, reason: points > 0 ? '完成任务' : '取消完成' } }),
    ])
    ctx.body = { code: 0, message: 'ok', data: { points: updated.points } }
  })

  router.get('/v2/point-records', familyScope, async (ctx) => {
    const { childId } = ctx.query as any
    const where: any = { child: { familyId: ctx.state.family.id } }
    if (childId) {
      const child = await childInScope(ctx, childId)
      if (!child) return
      where.childId = child.id
    }
    const records = await prisma.pointRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { child: { select: { id: true, name: true } } } })
    ctx.body = { code: 0, message: 'ok', data: records }
  })

  // ---------- 抽卡 ----------
  router.get('/v2/lottery/info', familyScope, async (ctx) => {
    const { childId } = ctx.query as any
    const child = await childInScope(ctx, childId)
    if (!child) return
    const cards = await prisma.studentCard.findMany({
      where: { childId: child.id },
      include: { card: true },
      orderBy: { drawnAt: 'desc' },
    })
    ctx.body = { code: 0, message: 'ok', data: { points: child.points, cards } }
  })

  router.post('/v2/lottery/draw', familyScope, async (ctx) => {
    const { childId, pointsCost } = ctx.request.body as { childId: string; pointsCost?: number }
    const child = await childInScope(ctx, childId)
    if (!child) return
    const cost = pointsCost ?? 10
    if (child.points < cost) {
      ctx.status = 400
      ctx.body = { code: 400, message: '积分不足', data: null }
      return
    }
    // ponytail: 沿用旧接口的简单均匀抽取；要稀有度权重再说
    const cards = await prisma.card.findMany({ where: { isActive: true } })
    if (cards.length === 0) {
      ctx.status = 400
      ctx.body = { code: 400, message: '奖池为空', data: null }
      return
    }
    const picked = cards[Math.floor(Math.random() * cards.length)]
    const [, studentCard] = await prisma.$transaction([
      prisma.child.update({ where: { id: child.id }, data: { points: { decrement: cost } } }),
      prisma.studentCard.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, cardId: picked.id } }),
      prisma.pointRecord.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, taskTitle: `抽卡：${picked.name}`, points: -cost, reason: '抽卡消耗' } }),
    ])
    ctx.body = { code: 0, message: 'ok', data: { card: picked, studentCard, pointsLeft: child.points - cost } }
  })
}

// 旧孩子账号登录拦截：挂到旧 /auth/login 前
export async function blockMigratedChildLogin(ctx: Context, next: Next) {
  const { username, password } = ctx.request.body as any
  if (username && password) {
    const user = await prisma.user.findUnique({ where: { username } })
    if (user && (user.role === 'user')) {
      ctx.status = 403
      ctx.body = { code: 403, message: '孩子账号已并入家庭档案，请用家长账号登录', data: null }
      return
    }
  }
  await next()
}

function genInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let c = ''
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
  return c
}
