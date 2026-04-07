import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const scheduleTool: Tool = {
  name: 'schedule_crud',
  description: `管理课程表数据的工具集，包括：
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
      type: { type: 'string', enum: ['homework', 'extracurricular'], description: '课程类型' },
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

const tools = [scheduleTool]

const server = new Server(
  { name: 'classmgr-schedule-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
)

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
  if (userId) {
    where.userId = userId
  }
  
  const schedules = await prisma.schedule.findMany({
    where,
    orderBy: [{ userId: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }]
  })
  
  return {
    success: true,
    data: schedules,
    total: schedules.length
  }
}

async function handleGetSchedule(args: any) {
  const { id } = args
  if (!id) {
    return { success: false, error: '缺少课程ID' }
  }
  
  const schedule = await prisma.schedule.findUnique({ where: { id } })
  if (!schedule) {
    return { success: false, error: '课程不存在' }
  }
  
  return { success: true, data: schedule }
}

async function handleCreateSchedule(args: any) {
  const { userId, name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, startDate, endDate } = args
  
  if (!userId || !name || !dayOfWeek || !startTime || !endTime || !type) {
    return { success: false, error: '缺少必填字段：userId, name, dayOfWeek, startTime, endTime, type' }
  }
  
  if (isDailyTask && (!points || points < 1)) {
    return { success: false, error: '当日任务需要设置积分值（最少1）' }
  }
  
  const schedule = await prisma.schedule.create({
    data: {
      userId,
      name,
      dayOfWeek,
      startTime,
      endTime,
      location,
      type,
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
  const { id, isDailyTask, points, startDate, endDate, ...updateData } = args
  
  if (!id) {
    return { success: false, error: '缺少课程ID' }
  }
  
  if (isDailyTask === true && (points === undefined || points < 1)) {
    return { success: false, error: '当日任务需要设置积分值（最少1）' }
  }
  
  if (isDailyTask !== undefined) updateData.isDailyTask = isDailyTask
  if (points !== undefined) updateData.points = points
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : null
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : null
  
  try {
    const schedule = await prisma.schedule.update({
      where: { id },
      data: updateData
    })
    return { success: true, data: schedule, message: '课程更新成功' }
  } catch (e: any) {
    if (e.code === 'P2025') {
      return { success: false, error: '课程不存在' }
    }
    throw e
  }
}

async function handleDeleteSchedule(args: any) {
  const { id } = args
  
  if (!id) {
    return { success: false, error: '缺少课程ID' }
  }
  
  try {
    await prisma.schedule.delete({ where: { id } })
    return { success: true, message: '课程删除成功' }
  } catch (e: any) {
    if (e.code === 'P2025') {
      return { success: false, error: '课程不存在' }
    }
    throw e
  }
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools }
})

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { arguments: args } = request.params
  const { operation } = args as any
  
  try {
    let result: any
    
    switch (operation) {
      case 'list_schedules':
        result = await handleListSchedules(args)
        break
      case 'get_schedule':
        result = await handleGetSchedule(args)
        break
      case 'create_schedule':
        result = await handleCreateSchedule(args)
        break
      case 'update_schedule':
        result = await handleUpdateSchedule(args)
        break
      case 'delete_schedule':
        result = await handleDeleteSchedule(args)
        break
      default:
        result = { success: false, error: `未知操作: ${operation}` }
    }
    
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    }
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: JSON.stringify({ success: false, error: error.message }, null, 2) }],
      isError: true
    }
  }
})

async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('ClassMgr Schedule MCP Server started')
}

main().catch(console.error)