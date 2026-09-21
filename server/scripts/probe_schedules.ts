import { prisma } from '../src/utils/prisma'

async function main() {
  // 模拟容器视角：isActive 过滤 + 时间窗过滤后查 Sophia 的课
  const sophia = await prisma.user.findFirst({ where: { username: 'sophia' } })
  if (!sophia) throw new Error('no sophia')
  const now = new Date()
  const schedules = await prisma.schedule.findMany({
    where: {
      userId: sophia.id,
      isActive: true,
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    },
    select: { name: true, dayOfWeek: true }
  })
  console.log('visible schedules:', JSON.stringify(schedules))
  process.exit(0)
}
main()
