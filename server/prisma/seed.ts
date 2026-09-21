import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function getDateMinusDays(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return new Date(date.toISOString().split('T')[0] + 'T00:00:00.000Z')
}

async function ensureFamily(name: string) {
  let family = await prisma.family.findFirst({ where: { name } })
  if (!family) family = await prisma.family.create({ data: { name } })
  return family
}

async function ensureChild(familyId: string, name: string, gender: string, points: number) {
  let child = await prisma.child.findFirst({ where: { familyId, name } })
  if (!child) child = await prisma.child.create({ data: { familyId, name, gender, points } })
  return child
}

async function main() {
  // ===== 家庭1：盛鹏家（admin=sp 兼家长 + daniel/sophia 档案） =====
  const family1 = await ensureFamily('盛鹏家')

  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: { familyId: family1.id },
    create: { username: 'admin', password: adminPassword, role: 'admin', name: '爸爸', familyId: family1.id, points: 0 }
  })

  const spPassword = await bcrypt.hash('sp123456', 10)
  await prisma.user.upsert({
    where: { username: 'sp' },
    update: { familyId: family1.id },
    create: { username: 'sp', password: spPassword, role: 'admin', familyId: family1.id, points: 0 }
  })

  const danielChild = await ensureChild(family1.id, 'Daniel', 'male', 100)
  const sophiaChild = await ensureChild(family1.id, 'Sophia', 'female', 80)

  // ===== 家庭2：示例家庭（parent + 一个孩子） =====
  const family2 = await ensureFamily('示例家')
  const parentPassword = await bcrypt.hash('parent123', 10)
  await prisma.user.upsert({
    where: { username: 'parent' },
    update: { familyId: family2.id },
    create: { username: 'parent', password: parentPassword, role: 'parent', familyId: family2.id, points: 0 }
  })
  const child2 = await ensureChild(family2.id, '小明', 'male', 50)
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  const uid = adminUser ? adminUser.id : (await prisma.user.findFirstOrThrow()).id // ponytail: userId 列保留期占位，批2 后不读写

  // ===== 业务数据：按 Child 挂 =====
  const existingDanielTasks = await prisma.task.count({ where: { childId: danielChild.id } })
  if (existingDanielTasks === 0) {
    const danielTasks = []
    for (let i = 0; i < 20; i++) {
      danielTasks.push(
        {
          title: i % 2 === 0 ? '数学作业' : '英语作业',
          type: 'homework',
          points: Math.floor(Math.random() * 5) + 1,
          childId: danielChild.id,
          userId: uid, // ponytail: userId 列保留期填充占位，批2 后不再读写
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 3
        },
        {
          title: i % 3 === 0 ? '钢琴课' : '绘画课',
          type: 'art',
          points: Math.floor(Math.random() * 5) + 1,
          childId: danielChild.id,
          userId: uid,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 5
        }
      )
    }
    await prisma.task.createMany({ data: danielTasks })
    console.log(`Created ${danielTasks.length} tasks for Daniel`)
  }

  const existingDanielSchedules = await prisma.schedule.count({ where: { childId: danielChild.id } })
  if (existingDanielSchedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { name: '数学', dayOfWeek: '1,3,5', startTime: '09:00', endTime: '10:00', location: '教室A', type: 'school', color: '#FFD93D', isDailyTask: true, points: 2, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '语文', dayOfWeek: '2,4', startTime: '14:00', endTime: '15:00', location: '教室B', type: 'school', color: '#98D8C8', isDailyTask: false, points: 1, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '英语补习', dayOfWeek: '1,5', startTime: '10:00', endTime: '11:00', location: '教室C', type: 'tutoring', color: '#FF8B8B', isDailyTask: true, points: 3, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '钢琴', dayOfWeek: '3,6', startTime: '16:00', endTime: '17:30', location: '音乐教室', type: 'art', color: '#A8D8EA', isDailyTask: false, points: 1, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '绘画', dayOfWeek: '2,4', startTime: '15:00', endTime: '16:00', location: '美术教室', type: 'art', color: '#DDA0DD', isDailyTask: true, points: 2, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '游泳', dayOfWeek: '6', startTime: '10:00', endTime: '11:00', location: '游泳馆', type: 'sports', color: '#87CEEB', isDailyTask: false, points: 1, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
        { name: '象棋', dayOfWeek: '0,6', startTime: '14:00', endTime: '15:00', location: '活动室', type: 'other', color: '#DEB887', isDailyTask: false, points: 1, childId: danielChild.id, userId: uid, startDate: null, endDate: null },
      ]
    })
    console.log('Created schedules for Daniel')
  }

  const existingSophiaTasks = await prisma.task.count({ where: { childId: sophiaChild.id } })
  if (existingSophiaTasks === 0) {
    const sophiaTasks = []
    for (let i = 0; i < 20; i++) {
      sophiaTasks.push(
        {
          title: i % 2 === 0 ? '语文作业' : '科学作业',
          type: 'homework',
          points: Math.floor(Math.random() * 5) + 1,
          childId: sophiaChild.id,
          userId: uid,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 2
        },
        {
          title: i % 2 === 0 ? '舞蹈课' : '小提琴课',
          type: 'art',
          points: Math.floor(Math.random() * 5) + 1,
          childId: sophiaChild.id,
          userId: uid,
          startDate: getDateMinusDays(i + 7),
          endDate: getDateMinusDays(i),
          isCompleted: i > 4
        }
      )
    }
    await prisma.task.createMany({ data: sophiaTasks })
    console.log(`Created ${sophiaTasks.length} tasks for Sophia`)
  }

  const existingSophiaSchedules = await prisma.schedule.count({ where: { childId: sophiaChild.id } })
  if (existingSophiaSchedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { name: '舞蹈', dayOfWeek: '1,3', startTime: '10:00', endTime: '11:30', location: '舞蹈教室', type: 'sports', color: '#FF69B4', isDailyTask: true, points: 2, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '小提琴', dayOfWeek: '2,5', startTime: '15:00', endTime: '16:00', location: '音乐教室', type: 'art', color: '#9370DB', isDailyTask: false, points: 1, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '语文', dayOfWeek: '1,4', startTime: '09:00', endTime: '10:00', location: '教室A', type: 'school', color: '#98D8C8', isDailyTask: true, points: 3, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '英语补习', dayOfWeek: '2,5', startTime: '14:00', endTime: '15:00', location: '教室B', type: 'tutoring', color: '#FFB6C1', isDailyTask: false, points: 1, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '绘画', dayOfWeek: '3,6', startTime: '16:00', endTime: '17:00', location: '美术教室', type: 'art', color: '#DDA0DD', isDailyTask: true, points: 2, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '钢琴', dayOfWeek: '4,6', startTime: '10:00', endTime: '11:00', location: '音乐教室', type: 'art', color: '#F0E68C', isDailyTask: false, points: 1, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
        { name: '书法', dayOfWeek: '0,6', startTime: '09:00', endTime: '10:00', location: '书法教室', type: 'art', color: '#8FBC8F', isDailyTask: false, points: 1, childId: sophiaChild.id, userId: uid, startDate: null, endDate: null },
      ]
    })
    console.log('Created schedules for Sophia')
  }

  // 示例家的孩子：少量课表
  const existingChild2Schedules = await prisma.schedule.count({ where: { childId: child2.id } })
  if (existingChild2Schedules === 0) {
    await prisma.schedule.createMany({
      data: [
        { name: '钢琴', dayOfWeek: '2,5', startTime: '17:00', endTime: '18:00', location: '音乐教室', type: 'art', color: '#A8D8EA', isDailyTask: false, points: 1, childId: child2.id, userId: uid, startDate: null, endDate: null },
        { name: '篮球', dayOfWeek: '6', startTime: '09:00', endTime: '10:30', location: '体育馆', type: 'sports', color: '#87CEEB', isDailyTask: false, points: 2, childId: child2.id, userId: uid, startDate: null, endDate: null },
      ]
    })
    console.log('Created schedules for 小明')
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

  console.log('Seed data initialized successfully (multi-family)')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
