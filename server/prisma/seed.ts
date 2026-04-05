import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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
