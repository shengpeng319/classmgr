import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============ Schedule CRUD ============
const scheduleTool: Tool = {
  name: 'schedule_crud',
  description: `管理课程表/任务数据的工具集，包括：
- list_schedules: 获取课程表列表（可按用户ID筛选）
- get_schedule: 获取单个课程详情
- create_schedule: 创建新课程
- update_schedule: 更新课程信息
- delete_schedule: 删除课程

每个操作都需要通过 operation 参数指定具体操作类型。`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_schedules', 'get_schedule', 'create_schedule', 'update_schedule', 'delete_schedule'],
        description: '操作类型'
      },
      id: { type: 'string', description: '课程ID（用于get/update/delete）' },
      userId: { type: 'string', description: '用户ID' },
      name: { type: 'string', description: '课程名称' },
      dayOfWeek: { type: 'string', description: '上课日，如 "1,3" 表示周一和周三' },
      startTime: { type: 'string', description: '开始时间，如 "09:00"' },
      endTime: { type: 'string', description: '结束时间，如 "10:00"' },
      location: { type: 'string', description: '上课地点' },
      type: { type: 'string', enum: ['school', 'homework', 'tutoring', 'sports', 'art', 'other'], description: '课程类型' },
      color: { type: 'string', description: '颜色标记，如 "#87CEEB"' },
      isDailyTask: { type: 'boolean', description: '是否为当日任务' },
      points: { type: 'number', description: '任务积分' },
      startDate: { type: 'string', description: '有效期起始日期，如 "2024-01-01"' },
      endDate: { type: 'string', description: '有效期结束日期，如 "2024-12-31"' },
      isActive: { type: 'boolean', description: '是否启用' }
    },
    required: ['operation']
  }
}

// ============ Course CRUD ============
const courseTool: Tool = {
  name: 'course_crud',
  description: `管理课程（课外班）的工具集，包括：
- list_courses: 获取课程列表
- get_course: 获取单个课程详情（含关联学生）
- create_course: 创建课程
- update_course: 更新课程信息
- delete_course: 删除课程
- add_student_to_course: 将学生加入课程
- remove_student_from_course: 将学生从课程移除`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_courses', 'get_course', 'create_course', 'update_course', 'delete_course', 'add_student_to_course', 'remove_student_from_course'],
        description: '操作类型'
      },
      id: { type: 'string', description: '课程ID' },
      name: { type: 'string', description: '课程名称' },
      description: { type: 'string', description: '课程描述' },
      color: { type: 'string', description: '颜色标记，如 "#87CEEB"' },
      dayOfWeek: { type: 'number', description: '星期几，0=周日，1=周一...' },
      startTime: { type: 'string', description: '开始时间，如 "09:00"' },
      endTime: { type: 'string', description: '结束时间，如 "10:00"' },
      location: { type: 'string', description: '上课地点' },
      isActive: { type: 'boolean', description: '是否启用' },
      studentId: { type: 'string', description: '学生ID（用于add/remove_student_to_course）' }
    },
    required: ['operation']
  }
}

// ============ Task CRUD ============
const taskTool: Tool = {
  name: 'task_crud',
  description: `管理任务的工具集，包括：
- list_tasks: 获取任务列表（可按userId筛选）
- get_task: 获取单个任务详情
- create_task: 创建任务
- update_task: 更新任务信息
- delete_task: 删除任务
- complete_task: 完成任务`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_tasks', 'get_task', 'create_task', 'update_task', 'delete_task', 'complete_task'],
        description: '操作类型'
      },
      id: { type: 'string', description: '任务ID' },
      userId: { type: 'string', description: '用户ID' },
      title: { type: 'string', description: '任务标题' },
      type: { type: 'string', enum: ['school', 'homework', 'tutoring', 'sports', 'art', 'other'], description: '任务类型' },
      points: { type: 'number', description: '任务积分' },
      startDate: { type: 'string', description: '有效开始日期，如 "2024-01-01"' },
      endDate: { type: 'string', description: '有效结束日期，如 "2024-12-31"' },
      isCompleted: { type: 'boolean', description: '是否已完成' }
    },
    required: ['operation']
  }
}

// ============ Student CRUD ============
const studentTool: Tool = {
  name: 'student_crud',
  description: `管理学生的工具集，包括：
- list_students: 获取学生列表
- get_student: 获取单个学生详情（含积分、课程、卡牌）
- create_student: 创建学生
- update_student: 更新学生信息
- delete_student: 删除学生
- get_points: 查询学生积分
- update_points: 修改学生积分（增加或减少）`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_students', 'get_student', 'create_student', 'update_student', 'delete_student', 'get_points', 'update_points'],
        description: '操作类型'
      },
      id: { type: 'string', description: '学生ID' },
      name: { type: 'string', description: '学生姓名' },
      avatar: { type: 'string', description: '头像URL' },
      points: { type: 'number', description: '积分（用于update_points或create时设置）' },
      pointsDelta: { type: 'number', description: '积分变化量（正数增加，负数减少，用于update_points）' },
      userId: { type: 'string', description: '关联的用户ID（可选）' }
    },
    required: ['operation']
  }
}

// ============ Card CRUD ============
const cardTool: Tool = {
  name: 'card_crud',
  description: `管理卡牌的工具集，包括：
- list_cards: 获取卡牌列表
- get_card: 获取单个卡牌详情
- create_card: 创建卡牌
- update_card: 更新卡牌信息
- delete_card: 删除卡牌
- list_student_cards: 获取学生拥有的卡牌
- draw_card: 学生抽取卡牌（消耗积分）`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_cards', 'get_card', 'create_card', 'update_card', 'delete_card', 'list_student_cards', 'draw_card'],
        description: '操作类型'
      },
      id: { type: 'string', description: '卡牌ID' },
      name: { type: 'string', description: '卡牌名称' },
      description: { type: 'string', description: '卡牌描述' },
      rarity: { type: 'string', enum: ['common', 'rare', 'epic', 'legendary'], description: '稀有度' },
      image: { type: 'string', description: '卡牌图片URL' },
      pointsCost: { type: 'number', description: '抽取所需积分' },
      stock: { type: 'number', description: '库存，-1=无限' },
      isActive: { type: 'boolean', description: '是否启用' },
      studentId: { type: 'string', description: '学生ID（用于list_student_cards或draw_card）' }
    },
    required: ['operation']
  }
}

// ============ User CRUD ============
const userTool: Tool = {
  name: 'user_crud',
  description: `管理用户数据的工具集，包括：
- list_users: 获取用户列表
- get_user: 获取单个用户详情（含关联学生积分）
- get_user_points: 根据用户名查询用户及其学生的积分
- create_user: 创建用户
- update_user: 更新用户信息
- delete_user: 删除用户`,
  inputSchema: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['list_users', 'get_user', 'get_user_points', 'create_user', 'update_user', 'delete_user'],
        description: '操作类型'
      },
      id: { type: 'string', description: '用户ID（用于get/update/delete）' },
      username: { type: 'string', description: '用户名（用于get_user_points）' },
      password: { type: 'string', description: '密码（用于create_user）' },
      role: { type: 'string', description: '角色，如 "admin" 或 "user"' },
      name: { type: 'string', description: '姓名' },
      avatar: { type: 'string', description: '头像URL' },
      gender: { type: 'string', description: '性别' },
      age: { type: 'number', description: '年龄' },
      phone: { type: 'string', description: '电话' }
    },
    required: ['operation']
  }
}

const tools = [scheduleTool, courseTool, taskTool, studentTool, cardTool, userTool]

const server = new Server(
  { name: 'classmgr-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

// ============ Schedule Handlers ============
async function handleListSchedules(args: any) {
  const { userId } = args
  const now = new Date()
  const where: any = {
    isActive: true,
    AND: [
      { OR: [{ startDate: null }, { startDate: { lte: now } }] },
      { OR: [{ endDate: null }, { endDate: { gte: now } }] }
    ]
  }
  if (userId) where.userId = userId
  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
  return { success: true, data: schedules, total: schedules.length }
}

async function handleGetSchedule(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule) return { success: false, error: '课程不存在' }
  return { success: true, data: schedule }
}

async function handleCreateSchedule(args: any) {
  const { userId, name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, startDate, endDate } = args
  if (!userId || !name || dayOfWeek === undefined || dayOfWeek === null || !startTime || !endTime || !type) {
    return { success: false, error: '缺少必填字段：userId, name, dayOfWeek, startTime, endTime, type' }
  }
  if (isDailyTask && (!points || points < 1)) {
    return { success: false, error: '当日任务需要设置积分值（最少1）' }
  }
  const schedule = await prisma.schedule.create({
    data: {
      userId, name, dayOfWeek: String(dayOfWeek), startTime, endTime, location, type,
      color: color || '#87CEEB',
      isDailyTask: isDailyTask || false,
      points: points || 1,
      startDate: startDate ? new Date(startDate + 'T00:00:00.000Z') : null,
      endDate: endDate ? new Date(endDate + 'T23:59:59.999Z') : null
    }
  })
  return { success: true, data: schedule, message: '课程创建成功' }
}

async function handleUpdateSchedule(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  if (updateData.startDate !== undefined) {
    updateData.startDate = updateData.startDate ? new Date(updateData.startDate + 'T00:00:00.000Z') : null
  }
  if (updateData.endDate !== undefined) {
    updateData.endDate = updateData.endDate ? new Date(updateData.endDate + 'T23:59:59.999Z') : null
  }
  try {
    const schedule = await prisma.schedule.update({ where: { id }, data: updateData })
    return { success: true, data: schedule, message: '课程更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '课程不存在' }
    throw e
  }
}

async function handleDeleteSchedule(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  try {
    await prisma.schedule.delete({ where: { id } })
    return { success: true, message: '课程删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '课程不存在' }
    throw e
  }
}

// ============ Course Handlers ============
async function handleListCourses(args: any) {
  const courses = await prisma.course.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  })
  return { success: true, data: courses, total: courses.length }
}

async function handleGetCourse(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  const course = await prisma.course.findUnique({
    where: { id },
    include: { students: { include: { student: true } } }
  })
  if (!course) return { success: false, error: '课程不存在' }
  return { success: true, data: course }
}

async function handleCreateCourse(args: any) {
  const { name, description, color, dayOfWeek, startTime, endTime, location } = args
  if (!name || dayOfWeek === undefined || !startTime || !endTime) {
    return { success: false, error: '缺少必填字段：name, dayOfWeek, startTime, endTime' }
  }
  const course = await prisma.course.create({
    data: { name, description, color: color || '#87CEEB', dayOfWeek, startTime, endTime, location }
  })
  return { success: true, data: course, message: '课程创建成功' }
}

async function handleUpdateCourse(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  try {
    const course = await prisma.course.update({ where: { id }, data: updateData })
    return { success: true, data: course, message: '课程更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '课程不存在' }
    throw e
  }
}

async function handleDeleteCourse(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少课程ID' }
  try {
    await prisma.course.delete({ where: { id } })
    return { success: true, message: '课程删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '课程不存在' }
    throw e
  }
}

async function handleAddStudentToCourse(args: any) {
  const { courseId, studentId } = args
  if (!courseId || !studentId) return { success: false, error: '缺少courseId或studentId' }
  try {
    const cs = await prisma.courseStudent.create({ data: { courseId, studentId } })
    return { success: true, data: cs, message: '学生已加入课程' }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: '学生已在课程中' }
    throw e
  }
}

async function handleRemoveStudentFromCourse(args: any) {
  const { courseId, studentId } = args
  if (!courseId || !studentId) return { success: false, error: '缺少courseId或studentId' }
  await prisma.courseStudent.deleteMany({ where: { courseId, studentId } })
  return { success: true, message: '学生已从课程移除' }
}

// ============ Task Handlers ============
async function handleListTasks(args: any) {
  const { userId } = args
  const where = userId ? { userId } : {}
  const tasks = await prisma.task.findMany({ where, orderBy: { createdAt: 'desc' } })
  return { success: true, data: tasks, total: tasks.length }
}

async function handleGetTask(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少任务ID' }
  const task = await prisma.task.findUnique({ where: { id } })
  if (!task) return { success: false, error: '任务不存在' }
  return { success: true, data: task }
}

async function handleCreateTask(args: any) {
  const { userId, title, type, points, startDate, endDate } = args
  if (!userId || !title || !type) {
    return { success: false, error: '缺少必填字段：userId, title, type' }
  }
  const task = await prisma.task.create({
    data: {
      userId, title, type,
      points: points || 5,
      startDate: startDate ? new Date(startDate + 'T00:00:00.000Z') : new Date(),
      endDate: endDate ? new Date(endDate + 'T23:59:59.999Z') : null
    }
  })
  return { success: true, data: task, message: '任务创建成功' }
}

async function handleUpdateTask(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少任务ID' }
  try {
    const task = await prisma.task.update({ where: { id }, data: updateData })
    return { success: true, data: task, message: '任务更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '任务不存在' }
    throw e
  }
}

async function handleDeleteTask(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少任务ID' }
  try {
    await prisma.task.delete({ where: { id } })
    return { success: true, message: '任务删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '任务不存在' }
    throw e
  }
}

async function handleCompleteTask(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少任务ID' }
  try {
    const task = await prisma.task.update({
      where: { id },
      data: { isCompleted: true, completedAt: new Date() }
    })
    return { success: true, data: task, message: '任务已完成' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '任务不存在' }
    throw e
  }
}

// ============ Student Handlers ============
async function handleListStudents(args: any) {
  const students = await prisma.student.findMany({ orderBy: { name: 'asc' } })
  return { success: true, data: students, total: students.length }
}

async function handleGetStudent(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少学生ID' }
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      courses: { include: { course: true } },
      ownedCards: { include: { card: true } },
      records: true
    }
  })
  if (!student) return { success: false, error: '学生不存在' }
  return { success: true, data: student }
}

async function handleCreateStudent(args: any) {
  const { name, avatar, points, userId } = args
  if (!name) return { success: false, error: '缺少学生姓名' }
  const student = await prisma.student.create({ data: { name, avatar, points: points || 0, userId } })
  return { success: true, data: student, message: '学生创建成功' }
}

async function handleUpdateStudent(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少学生ID' }
  try {
    const student = await prisma.student.update({ where: { id }, data: updateData })
    return { success: true, data: student, message: '学生信息更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '学生不存在' }
    throw e
  }
}

async function handleDeleteStudent(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少学生ID' }
  try {
    await prisma.student.delete({ where: { id } })
    return { success: true, message: '学生删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '学生不存在' }
    throw e
  }
}

async function handleGetPoints(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少学生ID' }
  const student = await prisma.student.findUnique({ where: { id }, select: { id: true, name: true, points: true } })
  if (!student) return { success: false, error: '学生不存在' }
  return { success: true, data: student }
}

async function handleUpdatePoints(args: any) {
  const { id, pointsDelta } = args
  if (!id) return { success: false, error: '缺少学生ID' }
  if (pointsDelta === undefined) return { success: false, error: '缺少pointsDelta' }
  const student = await prisma.student.findUnique({ where: { id } })
  if (!student) return { success: false, error: '学生不存在' }
  const newPoints = student.points + pointsDelta
  if (newPoints < 0) return { success: false, error: '积分不足' }
  const updated = await prisma.student.update({ where: { id }, data: { points: newPoints } })
  return { success: true, data: { id: updated.id, name: updated.name, points: updated.points, delta: pointsDelta }, message: '积分更新成功' }
}

// ============ Card Handlers ============
async function handleListCards(args: any) {
  const cards = await prisma.card.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  return { success: true, data: cards, total: cards.length }
}

async function handleGetCard(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少卡牌ID' }
  const card = await prisma.card.findUnique({ where: { id } })
  if (!card) return { success: false, error: '卡牌不存在' }
  return { success: true, data: card }
}

async function handleCreateCard(args: any) {
  const { name, description, rarity, image, pointsCost, stock } = args
  if (!name) return { success: false, error: '缺少卡牌名称' }
  const card = await prisma.card.create({
    data: { name, description, rarity: rarity || 'common', image, pointsCost: pointsCost || 10, stock: stock !== undefined ? stock : -1 }
  })
  return { success: true, data: card, message: '卡牌创建成功' }
}

async function handleUpdateCard(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少卡牌ID' }
  try {
    const card = await prisma.card.update({ where: { id }, data: updateData })
    return { success: true, data: card, message: '卡牌更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '卡牌不存在' }
    throw e
  }
}

async function handleDeleteCard(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少卡牌ID' }
  try {
    await prisma.card.delete({ where: { id } })
    return { success: true, message: '卡牌删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '卡牌不存在' }
    throw e
  }
}

async function handleListStudentCards(args: any) {
  const { studentId } = args
  if (!studentId) return { success: false, error: '缺少学生ID' }
  const cards = await prisma.studentCard.findMany({
    where: { studentId },
    include: { card: true },
    orderBy: { drawnAt: 'desc' }
  })
  return { success: true, data: cards, total: cards.length }
}

async function handleDrawCard(args: any) {
  const { studentId } = args
  if (!studentId) return { success: false, error: '缺少学生ID' }
  const student = await prisma.student.findUnique({ where: { id: studentId } })
  if (!student) return { success: false, error: '学生不存在' }
  const activeCards = await prisma.card.findMany({ where: { isActive: true } })
  if (activeCards.length === 0) return { success: false, error: '暂无可用卡牌' }
  const card = activeCards[Math.floor(Math.random() * activeCards.length)]
  if (card.stock === 0) return { success: false, error: '该卡牌已售罄' }
  if (student.points < card.pointsCost) {
    return { success: false, error: `积分不足，需要${card.pointsCost}积分，当前${student.points}积分` }
  }
  await prisma.student.update({ where: { id: studentId }, data: { points: { decrement: card.pointsCost } } })
  await prisma.studentCard.create({ data: { studentId, cardId: card.id } })
  if (card.stock > 0) await prisma.card.update({ where: { id: card.id }, data: { stock: card.stock - 1 } })
  return { success: true, data: { card, studentPoints: student.points - card.pointsCost }, message: `恭喜获得「${card.name}」！消耗${card.pointsCost}积分` }
}


// ============ User Handlers ============
async function handleListUsers(args: any) {
  const users = await prisma.user.findMany({
    orderBy: { username: 'asc' },
    include: { student: true }
  })
  return { success: true, data: users, total: users.length }
}

async function handleGetUser(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少用户ID' }
  const user = await prisma.user.findUnique({
    where: { id },
    include: { student: true }
  })
  if (!user) return { success: false, error: '用户不存在' }
  return { success: true, data: user }
}

async function handleGetUserPoints(args: any) {
  const { username } = args
  if (!username) return { success: false, error: '缺少用户名' }
  const user = await prisma.user.findUnique({
    where: { username },
    include: { student: true }
  })
  if (!user) return { success: false, error: '用户不存在' }
  return {
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      studentPoints: user.student?.points ?? null,
      studentId: user.student?.id ?? null
    }
  }
}

async function handleCreateUser(args: any) {
  const { username, password, role, name, avatar, gender, age, phone } = args
  if (!username || !password) return { success: false, error: '缺少用户名或密码' }
  try {
    const user = await prisma.user.create({
      data: { username, password, role: role || 'user', name, avatar, gender: gender || 'male', age: age || 0, phone }
    })
    return { success: true, data: user, message: '用户创建成功' }
  } catch (e: any) {
    if (e.code === 'P2002') return { success: false, error: '用户名已存在' }
    throw e
  }
}

async function handleUpdateUser(args: any) {
  const { id, operation, userId, ...updateData } = args
  if (!id) return { success: false, error: '缺少用户ID' }
  try {
    const user = await prisma.user.update({ where: { id }, data: updateData })
    return { success: true, data: user, message: '用户更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '用户不存在' }
    throw e
  }
}

async function handleDeleteUser(args: any) {
  const { id } = args
  if (!id) return { success: false, error: '缺少用户ID' }
  try {
    await prisma.user.delete({ where: { id } })
    return { success: true, message: '用户删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') return { success: false, error: '用户不存在' }
    throw e
  }
}

// ============ Main Handler ============
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { arguments: args } = request.params
  const { operation } = args as any
  try {
    let result: any
    if (operation === 'list_schedules') result = await handleListSchedules(args)
    else if (operation === 'get_schedule') result = await handleGetSchedule(args)
    else if (operation === 'create_schedule') result = await handleCreateSchedule(args)
    else if (operation === 'update_schedule') result = await handleUpdateSchedule(args)
    else if (operation === 'delete_schedule') result = await handleDeleteSchedule(args)
    else if (operation === 'list_courses') result = await handleListCourses(args)
    else if (operation === 'get_course') result = await handleGetCourse(args)
    else if (operation === 'create_course') result = await handleCreateCourse(args)
    else if (operation === 'update_course') result = await handleUpdateCourse(args)
    else if (operation === 'delete_course') result = await handleDeleteCourse(args)
    else if (operation === 'add_student_to_course') result = await handleAddStudentToCourse(args)
    else if (operation === 'remove_student_from_course') result = await handleRemoveStudentFromCourse(args)
    else if (operation === 'list_tasks') result = await handleListTasks(args)
    else if (operation === 'get_task') result = await handleGetTask(args)
    else if (operation === 'create_task') result = await handleCreateTask(args)
    else if (operation === 'update_task') result = await handleUpdateTask(args)
    else if (operation === 'delete_task') result = await handleDeleteTask(args)
    else if (operation === 'complete_task') result = await handleCompleteTask(args)
    else if (operation === 'list_students') result = await handleListStudents(args)
    else if (operation === 'get_student') result = await handleGetStudent(args)
    else if (operation === 'create_student') result = await handleCreateStudent(args)
    else if (operation === 'update_student') result = await handleUpdateStudent(args)
    else if (operation === 'delete_student') result = await handleDeleteStudent(args)
    else if (operation === 'get_points') result = await handleGetPoints(args)
    else if (operation === 'update_points') result = await handleUpdatePoints(args)
    else if (operation === 'list_cards') result = await handleListCards(args)
    else if (operation === 'get_card') result = await handleGetCard(args)
    else if (operation === 'create_card') result = await handleCreateCard(args)
    else if (operation === 'update_card') result = await handleUpdateCard(args)
    else if (operation === 'delete_card') result = await handleDeleteCard(args)
    else if (operation === 'list_student_cards') result = await handleListStudentCards(args)
    else if (operation === 'draw_card') result = await handleDrawCard(args)
    else if (operation === 'list_users') result = await handleListUsers(args)
    else if (operation === 'get_user') result = await handleGetUser(args)
    else if (operation === 'get_user_points') result = await handleGetUserPoints(args)
    else if (operation === 'create_user') result = await handleCreateUser(args)
    else if (operation === 'update_user') result = await handleUpdateUser(args)
    else if (operation === 'delete_user') result = await handleDeleteUser(args)
    else result = { success: false, error: `未知操作: ${operation}` }
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  } catch (error: any) {
    return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }], isError: true }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('ClassMgr MCP Server started')
}

main().catch(console.error)
