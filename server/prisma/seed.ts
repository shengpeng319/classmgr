import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getDateMinusDays(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z')
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'admin',
      points: 0
    }
  })

  const userPassword = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: userPassword,
      role: 'user',
      points: 100
    }
  })

  const danielPassword = await bcrypt.hash('daniel123', 10)
  const daniel = await prisma.user.upsert({
    where: { username: 'daniel' },
    update: {},
    create: {
      username: 'daniel',
      password: danielPassword,
      role: 'user',
      name: 'Daniel',
      points: 100
    }
  })

  const sophiaPassword = await bcrypt.hash('sophia123', 10)
  const sophia = await prisma.user.upsert({
    where: { username: 'sophia' },
    update: {},
    create: {
      username: 'sophia',
      password: sophiaPassword,
      role: 'user',
      name: 'Sophia',
      points: 80
    }
  })

  const existingDanielTasks = await prisma.task.count({ where: { userId: daniel.id } })
  if (existingDanielTasks === 0) {
    const danielTasks = []
    for (let i = 0; i < 20; i++) {
      danielTasks.push(
        {
          title: i % 2 === 0 ? '数学作业' : '英语作业',
          type: 'homework',
          points: Math.floor(Math.random() * 5) + 1,
          userId: daniel.id,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 3
        },
        {
          title: i % 3 === 0 ? '钢琴课' : '绘画课',
          type: 'art',
          points: Math.floor(Math.random() * 5) + 1,
          userId: daniel.id,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 5
        }
      )
    }
    await prisma.task.createMany({ data: danielTasks })
    console.log(`Created ${danielTasks.length} tasks for daniel`)
  }

  const existingDanielSchedules = await prisma.schedule.count({ where: { userId: daniel.id } })
  if (existingDanielSchedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { name: '数学', dayOfWeek: '1,3,5', startTime: '09:00', endTime: '10:00', location: '教室A', type: 'school', color: '#FFD93D', isDailyTask: true, points: 2, userId: daniel.id, startDate: null, endDate: null },
        { name: '语文', dayOfWeek: '2,4', startTime: '14:00', endTime: '15:00', location: '教室B', type: 'school', color: '#98D8C8', isDailyTask: false, points: 1, userId: daniel.id, startDate: null, endDate: null },
        { name: '英语补习', dayOfWeek: '1,5', startTime: '10:00', endTime: '11:00', location: '教室C', type: 'tutoring', color: '#FF8B8B', isDailyTask: true, points: 3, userId: daniel.id, startDate: null, endDate: null },
        { name: '钢琴', dayOfWeek: '3,6', startTime: '16:00', endTime: '17:30', location: '音乐教室', type: 'art', color: '#A8D8EA', isDailyTask: false, points: 1, userId: daniel.id, startDate: null, endDate: null },
        { name: '绘画', dayOfWeek: '2,4', startTime: '15:00', endTime: '16:00', location: '美术教室', type: 'art', color: '#DDA0DD', isDailyTask: true, points: 2, userId: daniel.id, startDate: null, endDate: null },
        { name: '游泳', dayOfWeek: '6', startTime: '10:00', endTime: '11:00', location: '游泳馆', type: 'sports', color: '#87CEEB', isDailyTask: false, points: 1, userId: daniel.id, startDate: null, endDate: null },
        { name: '象棋', dayOfWeek: '0,6', startTime: '14:00', endTime: '15:00', location: '活动室', type: 'other', color: '#DEB887', isDailyTask: false, points: 1, userId: daniel.id, startDate: null, endDate: null },
      ]
    })
    console.log('Created schedules for daniel')
  }

  const existingSophiaTasks = await prisma.task.count({ where: { userId: sophia.id } })
  if (existingSophiaTasks === 0) {
    const sophiaTasks = []
    for (let i = 0; i < 20; i++) {
      sophiaTasks.push(
        {
          title: i % 2 === 0 ? '语文作业' : '科学作业',
          type: 'homework',
          points: Math.floor(Math.random() * 5) + 1,
          userId: sophia.id,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 2
        },
        {
          title: i % 2 === 0 ? '舞蹈课' : '小提琴课',
          type: 'art',
          points: Math.floor(Math.random() * 5) + 1,
          userId: sophia.id,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 4
        }
      )
    }
    await prisma.task.createMany({ data: sophiaTasks })
    console.log(`Created ${sophiaTasks.length} tasks for sophia`)
  }

  const existingSophiaSchedules = await prisma.schedule.count({ where: { userId: sophia.id } })
  if (existingSophiaSchedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { name: '舞蹈', dayOfWeek: '1,3', startTime: '10:00', endTime: '11:30', location: '舞蹈教室', type: 'sports', color: '#FF69B4', isDailyTask: true, points: 2, userId: sophia.id, startDate: null, endDate: null },
        { name: '小提琴', dayOfWeek: '2,5', startTime: '15:00', endTime: '16:00', location: '音乐教室', type: 'art', color: '#9370DB', isDailyTask: false, points: 1, userId: sophia.id, startDate: null, endDate: null },
        { name: '语文', dayOfWeek: '1,4', startTime: '09:00', endTime: '10:00', location: '教室A', type: 'school', color: '#98D8C8', isDailyTask: true, points: 3, userId: sophia.id, startDate: null, endDate: null },
        { name: '英语补习', dayOfWeek: '2,5', startTime: '14:00', endTime: '15:00', location: '教室B', type: 'tutoring', color: '#FFB6C1', isDailyTask: false, points: 1, userId: sophia.id, startDate: null, endDate: null },
        { name: '绘画', dayOfWeek: '3,6', startTime: '16:00', endTime: '17:00', location: '美术教室', type: 'art', color: '#DDA0DD', isDailyTask: true, points: 2, userId: sophia.id, startDate: null, endDate: null },
        { name: '钢琴', dayOfWeek: '4,6', startTime: '10:00', endTime: '11:00', location: '音乐教室', type: 'art', color: '#F0E68C', isDailyTask: false, points: 1, userId: sophia.id, startDate: null, endDate: null },
        { name: '书法', dayOfWeek: '0,6', startTime: '09:00', endTime: '10:00', location: '书法教室', type: 'art', color: '#8FBC8F', isDailyTask: false, points: 1, userId: sophia.id, startDate: null, endDate: null },
      ]
    })
    console.log('Created schedules for sophia')
  }

  const existingCourses = await prisma.course.count()
  if (existingCourses === 0) {
    await prisma.course.createMany({
      data: [
        { name: '数学', dayOfWeek: 1, startTime: '09:00', endTime: '10:00', color: '#FFD93D' },
        { name: '英语', dayOfWeek: 2, startTime: '14:00', endTime: '15:00', color: '#98D8C8' },
        { name: '美术', dayOfWeek: 3, startTime: '10:00', endTime: '11:00', color: '#FF8B8B' },
        { name: '音乐', dayOfWeek: 5, startTime: '16:00', endTime: '17:00', color: '#A8D8EA' }
      ]
    })
  }

  const existingCards = await prisma.card.count()
  if (existingCards === 0) {
    await prisma.card.createMany({
      data: [
        { name: '勇敢的小熊', rarity: 'common', pointsCost: 10, description: '一只勇敢的小熊卡片' },
        { name: '智慧猫头鹰', rarity: 'rare', pointsCost: 20, description: '充满智慧的猫头鹰卡片' },
        { name: '彩虹独角兽', rarity: 'epic', pointsCost: 50, description: '闪耀的彩虹独角兽' },
        { name: '星空巨龙', rarity: 'legendary', pointsCost: 100, description: '传说中的星空巨龙' }
      ]
    })
  }

  console.log('Seed data initialized successfully')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })