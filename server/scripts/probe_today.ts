import { prisma } from '../src/utils/prisma'

async function main() {
  const now = new Date()
  const weekday = String(now.getDay())
  console.log('NOW:', now.toISOString(), 'weekday:', weekday)
  const sched = await prisma.schedule.findMany({
    where: { user: { username: 'sophia' }, isActive: true },
  })
  console.log('ACTIVE SCHEDULES:')
  sched.forEach(s => console.log(' ', s.dayOfWeek, '|', s.name, s.startTime, s.endTime, s.location))
  const tasks = await prisma.task.findMany({
    where: { user: { username: 'sophia' }, startDate: { lte: now }, endDate: { gte: now } },
    take: 20,
    orderBy: { startDate: 'asc' },
  })
  console.log('CURRENT TASKS (' + tasks.length + '):')
  tasks.forEach(t => console.log(' ', t.startDate.toISOString().slice(0, 10), t.title, t.isCompleted))
  await prisma.$disconnect()
}
main()
