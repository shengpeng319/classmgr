import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getDateMinusDays(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z')
}

function getDateStr(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().split('T')[0]
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'admin'
    }
  })

  const userPassword = await bcrypt.hash('user123', 10)
  await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: userPassword,
      role: 'user'
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
      name: 'Daniel'
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
      name: 'Sophia'
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
          type: 'extracurricular',
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
          type: 'extracurricular',
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

  const existingStudents = await prisma.student.count()
  if (existingStudents === 0) {
    await prisma.student.createMany({
      data: [
        { name: '小明', points: 100 },
        { name: '小红', points: 80 }
      ]
    })
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
