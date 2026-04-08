import * as cron from 'node-cron'
import { Prisma } from '@prisma/client'
import { prisma } from '../utils/prisma'

export function startDailyTaskCron() {
  cron.schedule('15 0 * * *', async () => {
    console.log('[Cron] Starting daily task generation...')
    await generateDailyTasks()
  }, {
    timezone: 'Asia/Shanghai'
  })

  console.log('[Cron] Daily task cron scheduled at 00:15 daily')
}

export async function generateDailyTasks() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)  // 当天最后一秒
  
  const dayOfWeek = today.getDay()
  
  console.log(`[Cron] Generating tasks for ${today.toISOString().split('T')[0]}, dayOfWeek: ${dayOfWeek}`)

  const dailySchedules = await prisma.schedule.findMany({
    where: {
      isDailyTask: true,
      isActive: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: today } }
          ]
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: today } }
          ]
        }
      ]
    }
  })

  console.log(`[Cron] Found ${dailySchedules.length} daily schedules`)

  const tasksToCreate: Prisma.TaskCreateManyInput[] = []

  for (const schedule of dailySchedules) {
    const scheduleDays = schedule.dayOfWeek.split(',').map(d => Number(d.trim()))
    
    if (!scheduleDays.includes(dayOfWeek)) {
      console.log(`[Cron] Schedule "${schedule.name}" is not on today (day ${dayOfWeek}), skipping`)
      continue
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        userId: schedule.userId,
        title: schedule.name,
        startDate: { lte: todayEnd },
        endDate: { gte: today }
      }
    })

    if (existingTask) {
      console.log(`[Cron] Task for "${schedule.name}" already exists for today, skipping`)
      continue
    }

    tasksToCreate.push({
      userId: schedule.userId,
      title: schedule.name,
      type: schedule.type,
      points: schedule.points || 1,
      startDate: today,
      endDate: todayEnd,  // 当日任务只当天有效，到今天结束就过期
      isCompleted: false
    })

    console.log(`[Cron] Will create task: "${schedule.name}" for user ${schedule.userId}`)
  }

  if (tasksToCreate.length > 0) {
    await prisma.task.createMany({
      data: tasksToCreate
    })
    console.log(`[Cron] Created ${tasksToCreate.length} tasks`)
  } else {
    console.log(`[Cron] No tasks to create`)
  }

  console.log(`[Cron] Daily task generation completed`)
}