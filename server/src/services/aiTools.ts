/**
 * AI 工具注册表（L2）—— 白名单注册制
 *
 * 每个工具 = { name, description, parameters(JSON Schema), needsConfirm, summarize, execute }
 * 安全约定：
 *  - execute 的 userId 一律取自登录态（AIContext），绝不信任模型传参里的用户身份
 *  - needsConfirm=true 的工具不直接执行：先存入内存 pending map（5 分钟过期），
 *    用户点击确认后由 POST /ai/confirm 触发真正的 execute
 *  - 工具内部只是「调用」现有 prisma 查询模式，不改各路由的业务逻辑
 */
import { randomUUID } from 'crypto'
import { prisma } from '../utils/prisma'
import { ToolDef } from './llm'

export interface AIContext {
  userId: string
  username: string
  role: string
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, any>
  needsConfirm: boolean
  /** 生成给用户看的操作摘要（确认按钮场景） */
  summarize(args: any): string
  execute(ctx: AIContext, args: any): Promise<any>
}

// ---- 公共辅助 ----

const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const SCHEDULE_TYPES = ['school', 'tutoring', 'homework', 'sports', 'art', 'other']

function toDateStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`)
}

function toDateEnd(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDayOfWeek(dayOfWeek: string): string {
  return String(dayOfWeek)
    .split(',')
    .map((d) => {
      const n = parseInt(d.trim(), 10)
      return WEEKDAY_NAMES[n] ?? d.trim()
    })
    .join('、')
}

function normalizeScheduleList(args: any): any[] {
  const raw = args?.schedules
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object') return [raw]
  if (args && !args.schedules && args.name) return [args] // 模型偶尔直接传单个对象
  return []
}

// ---- 工具实现 ----

/**
 * 解析查询目标用户：admin 可用 childName 指定孩子（模糊匹配用户名/姓名），缺省查自己；
 * 普通用户一律查自己（不信任模型传参）。
 * ponytail: childName 需唯一匹配，歧义时报错列出候选；孩子多了再考虑精确 id 传参。
 */
export async function resolveTargetUser(ctx: AIContext, args: any): Promise<{ userId: string; userName: string; childId?: string }> {
  const me = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true, username: true, familyId: true, role: true } })
  const kw = args?.childName ? String(args.childName).trim() : ''
  // 家长/admin：解析本家庭孩子（childName 指定；没指定且家里只有1个孩子则用那个）
  if (me?.familyId && (me.role === 'admin' || me.role === 'parent') && (kw || !args?.childName)) {
    const kids = await prisma.child.findMany({ where: { familyId: me.familyId, ...(kw ? { name: { contains: kw } } : {}) } })
    if (kids.length === 1) {
      return { userId: ctx.userId, userName: kids[0].name, childId: kids[0].id }
    }
    if (kids.length > 1) {
      if (!kw) throw new Error(`家里有多个孩子：${kids.map((c) => c.name).join('、')}，请说明给谁`)
      throw new Error(`「${kw}」匹配到多个孩子：${kids.map((c) => c.name).join('、')}，请说得更具体些`)
    }
    if (kw) {
      const candidates = await prisma.user.findMany({
        where: { role: { not: 'admin' }, OR: [{ name: { contains: kw } }, { username: { contains: kw } }] },
        select: { id: true, name: true, username: true }
      })
      if (candidates.length === 1) return { userId: candidates[0].id, userName: candidates[0].name || candidates[0].username }
    }
  }
  if (!kw) {
    return { userId: ctx.userId, userName: me?.name || me?.username || ctx.username }
  }
  throw new Error(`找不到孩子「${kw}」，可先用 list_children 查看孩子列表`)
}

/**
 * 读工具专用：admin 未指定 childName 时查所有孩子（家长问"今天有什么课"通常指孩子们的），
 * 避免缺省落到家长自己（无数据）导致 AI 答"没有"。普通用户返回自己。
 */
async function resolveReadTargets(ctx: AIContext, args: any): Promise<Array<{ userId: string; userName: string }>> {
  if (ctx.role !== 'admin') {
    const t = await resolveTargetUser(ctx, args)
    return [t]
  }
  if (args?.childName) {
    const t = await resolveTargetUser(ctx, args)
    return [t]
  }
  const children = await prisma.user.findMany({
    where: { role: { not: 'admin' }, name: { not: null } },
    select: { id: true, name: true, username: true },
    orderBy: { createdAt: 'asc' }
  })
  if (children.length === 0) {
    const t = await resolveTargetUser(ctx, args)
    return [t]
  }
  return children.map((c) => ({ userId: c.id, userName: c.name || c.username }))
}

const listSchedules: AITool = {
  name: 'list_schedules',
  description: '查询长期课程表（每周固定重复的课，如舞蹈课、钢琴课），返回课程名、星期、时间段、地点。用户问「今天/周几有什么课」时必须传 date 参数（服务端会自动按星期过滤）；问整周课表可不传。注意：这与 task（某天的当日任务）是两个不同概念。管理员可用 childName 指定孩子，缺省查自己',
  parameters: {
    type: 'object',
    properties: {
      childName: { type: 'string', description: '（仅管理员）孩子姓名或用户名，模糊匹配' },
      date: { type: 'string', description: 'YYYY-MM-DD。用户问「今天/某天有什么课」时必传，服务端只返回当天的课程；缺省返回整周课程表' }
    }
  },
  needsConfirm: false,
  summarize: (args) => `查询课程表${args?.childName ? `（${args.childName}）` : ''}`,
  execute: async (ctx, args) => {
    const targets = await resolveReadTargets(ctx, args)
    const now = new Date()
    // 服务端按星期过滤，不依赖模型自己匹配 dayOfWeek
    let weekday: string | null = null
    let dateText: string | undefined
    if (typeof args?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date)) {
      weekday = String(new Date(args.date + 'T12:00:00+08:00').getDay())
      dateText = args.date
    }
    const perChild = await Promise.all(targets.map(async (target) => {
      const schedules = await prisma.schedule.findMany({
        where: {
          userId: target.userId,
          isActive: true,
          ...(weekday ? { dayOfWeek: { contains: weekday } } : {}),
          AND: [
            { OR: [{ startDate: null }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null }, { endDate: { gte: now } }] }
          ]
        },
        orderBy: [{ startTime: 'asc' }]
      })
      return { target, schedules }
    }))
    return {
      date: dateText,
      weekday,
      count: perChild.reduce((n, p) => n + p.schedules.length, 0),
      byChild: perChild.map((p) => ({
        owner: p.target.userName,
        count: p.schedules.length,
        schedules: p.schedules.map((s) => ({
          id: s.id,
          name: s.name,
          dayOfWeek: s.dayOfWeek,
          dayOfWeekText: formatDayOfWeek(s.dayOfWeek),
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location,
          type: s.type,
          isDailyTask: s.isDailyTask,
          points: s.points,
          startDate: s.startDate,
          endDate: s.endDate
        }))
      }))
    }
  }
}

const createSchedules: AITool = {
  name: 'create_schedules',
  description:
    '批量新增课程表条目（课表图片识别结果的落库也用它）。每条课程包含：name(课程名)、dayOfWeek(字符串，逗号分隔，0=周日、1=周一…6=周六，如"3")、startTime/endTime(24小时制 HH:mm，如下午3点=15:00)、type(school|tutoring|homework|sports|art|other，游泳/篮球等归 sports)；可选 location、color、isDailyTask(是否每日任务)、points、startDate/endDate(YYYY-MM-DD 有效期)',
  parameters: {
    type: 'object',
    properties: {
      schedules: {
        type: 'array',
        description: '要新增的课程列表',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: '课程名称，如 游泳课' },
            dayOfWeek: { type: 'string', description: '星期几，逗号分隔，0=周日' },
            startTime: { type: 'string', description: '开始时间 HH:mm' },
            endTime: { type: 'string', description: '结束时间 HH:mm' },
            location: { type: 'string' },
            type: { type: 'string', enum: SCHEDULE_TYPES },
            color: { type: 'string' },
            isDailyTask: { type: 'boolean' },
            points: { type: 'number' },
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' }
          },
          required: ['name', 'dayOfWeek', 'startTime', 'endTime', 'type']
        },
        childName: { type: 'string', description: '（仅管理员）孩子姓名，课程归属谁' }
      }
    },
    required: ['schedules']
  },
  needsConfirm: true,
  summarize: (args) => {
    const list = normalizeScheduleList(args)
    if (!list.length) return '新增课程'
    return `新增课程：${list
      .map(
        (s: any) =>
          `${s.name} ${formatDayOfWeek(String(s.dayOfWeek ?? ''))} ${s.startTime || ''}-${s.endTime || ''}`
      )
      .join('；')}`
  },
  execute: async (ctx, args) => {
    const list = normalizeScheduleList(args)
    if (!list.length) throw new Error('没有可创建的课程')

    // LLM 有时把 childName 放进 schedules[0] 而不是顶层——提升后统一解析
    const topChildName = args?.childName || list.find((s: any) => s.childName)?.childName
    const target = await resolveTargetUser(ctx, { ...args, childName: topChildName })
    const childId: string | null = target.childId ?? null

    const data = list.map((s: any) => ({
      userId: target.userId,
      childId: childId ?? undefined,
      name: String(s.name || '').trim(),
      dayOfWeek: String(s.dayOfWeek ?? '').trim(),
      startTime: String(s.startTime || '').trim(),
      endTime: String(s.endTime || '').trim(),
      location: s.location ? String(s.location) : undefined,
      type: SCHEDULE_TYPES.includes(s.type) ? s.type : 'other',
      color: s.color || '#87CEEB',
      isDailyTask: !!s.isDailyTask,
      points: Number(s.points) > 0 ? Number(s.points) : 1,
      startDate: s.startDate ? toDateStart(String(s.startDate)) : null,
      endDate: s.endDate ? toDateEnd(String(s.endDate)) : null
    }))

    for (const d of data) {
      if (!d.name || !d.dayOfWeek || !d.startTime || !d.endTime) {
        throw new Error('课程缺少必填字段（name/dayOfWeek/startTime/endTime）')
      }
    }

    const result = await prisma.schedule.createMany({ data })
    return {
      success: true,
      createdCount: result.count,
      schedules: data.map(
        (d) => `${d.name} ${formatDayOfWeek(d.dayOfWeek)} ${d.startTime}-${d.endTime}`
      )
    }
  }
}

const createTask: AITool = {
  name: 'create_task',
  description:
    '新增某一天的一次性任务（如"明天写作业"、"周日打扫房间"）。这与 create_schedules 不同：任务是单次事项，不重复，当天可勾选完成得积分。参数：title、date(YYYY-MM-DD，"明天"等需换算成具体日期)、type(school|tutoring|homework|sports|art|other)、points(积分，默认5)。管理员可用 childName 指定孩子',
  parameters: {
    type: 'object',
    properties: {
      title: { type: 'string', description: '任务名称，如 写作业' },
      date: { type: 'string', description: 'YYYY-MM-DD，任务在哪天，"今天/明天/周日"必须换算成具体日期' },
      type: { type: 'string', enum: SCHEDULE_TYPES },
      points: { type: 'number', description: '完成后得积分，默认5' },
      childName: { type: 'string', description: '（仅管理员）孩子姓名' }
    },
    required: ['title', 'date']
  },
  needsConfirm: true,
  summarize: (args) => `新增任务：${args?.title}（${args?.date}）`,
  execute: async (ctx, args) => {
    const target = await resolveTargetUser(ctx, args)
    const date = String(args?.date || '')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('date 必须是 YYYY-MM-DD 格式，请把"明天/周几"换算成具体日期')
    const title = String(args?.title || '').trim()
    if (!title) throw new Error('任务名称不能为空')
    // 任务同时写 userId（旧列）与 childId（新模型）
    const childId: string | null = target.childId ?? null
    const task = await prisma.task.create({
      data: {
        userId: target.userId,
        childId: childId ?? undefined,
        title,
        type: SCHEDULE_TYPES.includes(args?.type) ? args.type : 'other',
        points: Number(args?.points) > 0 ? Number(args.points) : 5,
        startDate: toDateStart(date),
        endDate: toDateEnd(date)
      }
    })
    return { success: true, taskId: task.id, owner: target.userName, title, date, points: task.points }
  }
}

const updateSchedule: AITool = {
  name: 'update_schedule',
  description:
    '修改当前用户的一条课程表（先用 list_schedules 拿到 id）。可修改字段：name、dayOfWeek、startTime、endTime、location、type、color、isDailyTask、points、startDate/endDate(YYYY-MM-DD 或 null 表示永久)',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '课程表条目 id' },
      name: { type: 'string' },
      dayOfWeek: { type: 'string' },
      startTime: { type: 'string' },
      endTime: { type: 'string' },
      location: { type: 'string' },
      type: { type: 'string', enum: SCHEDULE_TYPES },
      color: { type: 'string' },
      isDailyTask: { type: 'boolean' },
      points: { type: 'number' },
      startDate: { type: ['string', 'null'], description: 'YYYY-MM-DD 或 null' },
      endDate: { type: ['string', 'null'], description: 'YYYY-MM-DD 或 null' }
    },
    required: ['id']
  },
  needsConfirm: true,
  summarize: (args) => {
    const changes = Object.keys(args || {})
      .filter((k) => k !== 'id')
      .map((k) => {
        let v = (args as any)[k]
        if (k === 'dayOfWeek' && typeof v === 'string') v = formatDayOfWeek(v)
        return `${k} → ${v}`
      })
    return `修改课程（id=${args?.id}）：${changes.join('，') || '无变更'}`
  },
  execute: async (ctx, args) => {
    const id = String(args?.id || '')
    if (!id) throw new Error('缺少课程 id')
    const existing = await prisma.schedule.findUnique({ where: { id } })
    if (!existing || existing.userId !== ctx.userId) {
      throw new Error('课程不存在或无权操作')
    }

    const updateData: any = {}
    if (args.name !== undefined) updateData.name = String(args.name)
    if (args.dayOfWeek !== undefined) updateData.dayOfWeek = String(args.dayOfWeek)
    if (args.startTime !== undefined) updateData.startTime = String(args.startTime)
    if (args.endTime !== undefined) updateData.endTime = String(args.endTime)
    if (args.location !== undefined) updateData.location = args.location
    if (args.type !== undefined) updateData.type = SCHEDULE_TYPES.includes(args.type) ? args.type : existing.type
    if (args.color !== undefined) updateData.color = args.color
    if (args.isDailyTask !== undefined) updateData.isDailyTask = !!args.isDailyTask
    if (args.points !== undefined) updateData.points = Number(args.points) > 0 ? Number(args.points) : existing.points
    if (args.startDate !== undefined) {
      updateData.startDate = args.startDate ? toDateStart(String(args.startDate)) : null
    }
    if (args.endDate !== undefined) {
      updateData.endDate = args.endDate ? toDateEnd(String(args.endDate)) : null
    }

    const updated = await prisma.schedule.update({ where: { id }, data: updateData })
    return {
      success: true,
      schedule: {
        id: updated.id,
        name: updated.name,
        dayOfWeekText: formatDayOfWeek(updated.dayOfWeek),
        startTime: updated.startTime,
        endTime: updated.endTime
      }
    }
  }
}

const deleteSchedule: AITool = {
  name: 'delete_schedule',
  description: '删除当前用户的一条课程表（先用 list_schedules 拿到 id，删除前向用户复述课程名和时间）',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string', description: '课程表条目 id' }
    },
    required: ['id']
  },
  needsConfirm: true,
  summarize: (args) => `删除课程（id=${args?.id}）`,
  execute: async (ctx, args) => {
    const id = String(args?.id || '')
    if (!id) throw new Error('缺少课程 id')
    const existing = await prisma.schedule.findUnique({ where: { id } })
    if (!existing || existing.userId !== ctx.userId) {
      throw new Error('课程不存在或无权操作')
    }
    await prisma.schedule.delete({ where: { id } })
    return {
      success: true,
      deleted: `${existing.name} ${formatDayOfWeek(existing.dayOfWeek)} ${existing.startTime}-${existing.endTime}`
    }
  }
}

const listTasks: AITool = {
  name: 'list_tasks',
  description: '查询某一天的当日任务列表（一次性事项，可勾选完成得积分；由系统每天从课程模板自动生成），默认今天。schedule=每周重复的课程模板（不能完成）；task=某天的一次性任务（能完成）。问「有什么课/每周几上什么」用 list_schedules；只有问「任务/要做的事/待完成」才用本工具。管理员可用 childName 指定孩子，缺省查自己',
  parameters: {
    type: 'object',
    properties: {
      date: { type: 'string', description: 'YYYY-MM-DD，缺省为今天' },
      childName: { type: 'string', description: '（仅管理员）孩子姓名或用户名，模糊匹配' }
    }
  },
  needsConfirm: false,
  summarize: (args) => `查询任务（${args?.childName ? args.childName + ' ' : ''}${args?.date || '今天'}）`,
  execute: async (ctx, args) => {
    const target = await resolveTargetUser(ctx, args)
    const date = typeof args?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : todayStr()
    const tasks = await prisma.task.findMany({
      where: {
        userId: target.userId,
        AND: [{ endDate: { gte: toDateStart(date) } }, { startDate: { lte: toDateEnd(date) } }]
      },
      orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }]
    })
    return {
      owner: target.userName,
      date,
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        points: t.points,
        isCompleted: t.isCompleted
      }))
    }
  }
}

const completeTask: AITool = {
  name: 'complete_task',
  description:
    '完成（或撤销完成）当前用户的一条任务，会同步发放/扣回任务积分并写入积分记录。isCompleted 缺省为 true（标记完成）',
  parameters: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: '任务 id（可用 list_tasks 查询）' },
      isCompleted: { type: 'boolean', description: 'true=完成，false=撤销完成' }
    },
    required: ['taskId']
  },
  needsConfirm: true,
  summarize: (args) =>
    args?.isCompleted === false
      ? `撤销完成任务（taskId=${args?.taskId}）`
      : `完成任务（taskId=${args?.taskId}）`,
  execute: async (ctx, args) => {
    const taskId = String(args?.taskId || '')
    const target = args?.isCompleted !== false
    if (!taskId) throw new Error('缺少任务 id')

    const task = await prisma.task.findUnique({ where: { id: taskId } })
    if (!task || task.userId !== ctx.userId) {
      throw new Error('任务不存在或无权操作')
    }
    if (task.isCompleted === target) {
      return { success: true, noOp: true, message: `任务「${task.title}」已处于${target ? '完成' : '未完成'}状态` }
    }

    const pointDelta = target ? task.points : -task.points
    const [, user] = await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: { isCompleted: target, completedAt: target ? new Date() : null }
      }),
      prisma.user.update({
        where: { id: ctx.userId },
        data: { points: { increment: pointDelta } }
      }),
      prisma.pointRecord.create({
        data: {
          userId: ctx.userId,
          taskId: task.id,
          taskTitle: task.title,
          points: pointDelta,
          reason: target ? '完成任务' : '撤销完成'
        }
      })
    ])

    return {
      success: true,
      taskTitle: task.title,
      isCompleted: target,
      pointsDelta: pointDelta,
      remainingPoints: user.points
    }
  }
}

const listPointRecords: AITool = {
  name: 'list_point_records',
  description: '查询用户最近的积分变动记录（含任务完成、管理员调整）。管理员可用 childName 指定孩子，缺省查自己',
  parameters: {
    type: 'object',
    properties: {
      childName: { type: 'string', description: '（仅管理员）孩子姓名或用户名，模糊匹配' }
    }
  },
  needsConfirm: false,
  summarize: (args) => `查询积分记录${args?.childName ? `（${args.childName}）` : ''}`,
  execute: async (ctx, args) => {
    const target = await resolveTargetUser(ctx, args)
    const records = await prisma.pointRecord.findMany({
      where: { userId: target.userId },
      orderBy: { createdAt: 'desc' },
      take: 20
    })
    return {
      owner: target.userName,
      count: records.length,
      records: records.map((r) => ({
        taskTitle: r.taskTitle,
        points: r.points,
        reason: r.reason,
        createdAt: r.createdAt
      }))
    }
  }
}

const getPoints: AITool = {
  name: 'get_points',
  description: '查询用户的当前积分余额。管理员可用 childName 指定孩子，缺省查自己',
  parameters: {
    type: 'object',
    properties: {
      childName: { type: 'string', description: '（仅管理员）孩子姓名或用户名，模糊匹配' }
    }
  },
  needsConfirm: false,
  summarize: (args) => `查询积分${args?.childName ? `（${args.childName}）` : ''}`,
  execute: async (ctx, args) => {
    const target = await resolveTargetUser(ctx, args)
    if (target.childId) {
      const child = await prisma.child.findUnique({ where: { id: target.childId }, select: { points: true } })
      return { owner: target.userName, points: child?.points ?? 0 }
    }
    const user = await prisma.user.findUnique({
      where: { id: target.userId },
      select: { points: true }
    })
    return { owner: target.userName, points: user?.points ?? 0 }
  }
}

const addPoints: AITool = {
  name: 'add_points',
  description:
    '给指定孩子加减积分，points 为正数加分、负数减分，需说明原因',
  parameters: {
    type: 'object',
    properties: {
      childName: { type: 'string', description: '孩子姓名，模糊匹配' },
      points: { type: 'number', description: '积分变化，正数加分，负数减分' },
      reason: { type: 'string', description: '调整原因' }
    },
    required: ['points']
  },
  needsConfirm: true,
  summarize: (args) =>
    `调整积分：${args?.childName || '孩子'} ${args?.points > 0 ? '+' : ''}${args?.points}（${args?.reason || '无原因'}）`,
  execute: async (ctx, args) => {
    const target = await resolveTargetUser(ctx, args)
    const delta = Number(args?.points)
    if (!Number.isFinite(delta) || delta === 0) throw new Error('积分变化必须是非零数字')
    if (!target.childId) throw new Error(`积分挂在孩子档案上，找不到「${target.userName}」的孩子档案`)

    const [, updated] = await prisma.$transaction([
      prisma.pointRecord.create({
        data: {
          childId: target.childId,
          userId: ctx.userId,
          taskId: null,
          taskTitle: 'AI 助手调整',
          points: delta,
          reason: args?.reason ? String(args.reason) : 'AI 助手调整'
        }
      }),
      prisma.child.update({
        where: { id: target.childId },
        data: { points: { increment: delta } }
      })
    ])

    return {
      success: true,
      targetUser: target.userName,
      adjusted: delta,
      points: updated.points
    }
  }
}

const listCards: AITool = {
  name: 'list_cards',
  description: '查询抽卡卡池中的所有卡牌（名称、稀有度、所需积分、库存）',
  parameters: { type: 'object', properties: {} },
  needsConfirm: false,
  summarize: () => '查询卡牌',
  execute: async () => {
    const cards = await prisma.card.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
    })
    return {
      count: cards.length,
      cards: cards.map((c) => ({
        name: c.name,
        rarity: c.rarity,
        pointsCost: c.pointsCost,
        stock: c.stock
      }))
    }
  }
}

// ---- 注册表 ----

const listChildren: AITool = {
  name: 'list_children',
  description: '（仅管理员）列出所有孩子（普通用户）的 id、姓名、用户名、当前积分，用于后续按孩子查询课程/任务/积分',
  parameters: { type: 'object', properties: {} },
  needsConfirm: false,
  summarize: () => '查询孩子列表',
  execute: async (ctx) => {
    if (ctx.role !== 'admin') throw new Error('仅管理员可以查看孩子列表')
    // 孩子=本家庭 Child 档案（排除残留 User 行：probe/user 等历史测试账号）
    const me = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { familyId: true } })
    const family = me?.familyId
      ? await prisma.child.findMany({ where: { familyId: me.familyId }, select: { id: true, name: true, points: true }, orderBy: { createdAt: 'asc' } })
      : []
    if (family.length > 0) return { children: family.map(c => ({ id: c.id, name: c.name, points: c.points })) }
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, name: true, username: true, points: true },
      orderBy: { createdAt: 'asc' }
    })
    return {
      count: users.length,
      children: users.map((u) => ({ id: u.id, name: u.name, username: u.username, points: u.points }))
    }
  }
}

const allTools: AITool[] = [
  listChildren,
  listSchedules,
  createSchedules,
  updateSchedule,
  deleteSchedule,
  listTasks,
  createTask,
  completeTask,
  listPointRecords,
  getPoints,
  addPoints,
  listCards
]

export function getAITool(name: string): AITool | undefined {
  return allTools.find((t) => t.name === name)
}

/** 导出给 LLM 的工具定义；管理员工具（add_points）只对 admin 暴露 */
export function aiToolDefs(role: string): ToolDef[] {
  return allTools
    .filter((t) => t.name !== 'add_points' || role === 'admin' || role === 'parent')
    .map((t) => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }))
}

// ---- 待确认操作（内存 pending map，5 分钟过期） ----

interface PendingConfirm {
  id: string
  userId: string
  toolName: string
  args: any
  summary: string
  expiresAt: number
}

const pendingConfirms = new Map<string, PendingConfirm>()
const CONFIRM_TTL_MS = 5 * 60 * 1000

function cleanupExpired() {
  const now = Date.now()
  for (const [key, value] of pendingConfirms) {
    if (value.expiresAt < now) pendingConfirms.delete(key)
  }
}

function safeSummarize(tool: AITool, args: any): string {
  try {
    return tool.summarize(args)
  } catch {
    return `${tool.name} ${JSON.stringify(args || {}).slice(0, 200)}`
  }
}

export function createPendingConfirm(userId: string, toolName: string, args: any): { confirmId: string; summary: string } {
  cleanupExpired()
  const tool = getAITool(toolName)
  if (!tool) throw new Error(`未知工具: ${toolName}`)
  const confirmId = randomUUID()
  const summary = safeSummarize(tool, args)
  pendingConfirms.set(confirmId, {
    id: confirmId,
    userId,
    toolName,
    args,
    summary,
    expiresAt: Date.now() + CONFIRM_TTL_MS
  })
  return { confirmId, summary }
}

/** 取出（一次性）待确认操作；不存在 / 过期 / 非本人均返回 null */
export function takePendingConfirm(confirmId: string, userId: string): PendingConfirm | null {
  cleanupExpired()
  const pending = pendingConfirms.get(confirmId)
  if (!pending) return null
  pendingConfirms.delete(confirmId)
  if (pending.userId !== userId || pending.expiresAt < Date.now()) return null
  return pending
}
