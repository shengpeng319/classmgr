import { prisma } from '../src/utils/prisma'

async function main() {
  const now = new Date()
  const rows = await prisma.schedule.findMany({
    where: {
      user: { username: 'sophia' },
      isActive: true,
      dayOfWeek: { contains: '1' },
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    }
  })
  console.log('MATCH weekday=1:', rows.map(r => r.name + '(' + r.dayOfWeek + ')').join(', ') || '(EMPTY)')
  const all = await prisma.schedule.findMany({ where: { user: { username: 'sophia' }, isActive: true } })
  console.log('ALL dayOfWeek values:', JSON.stringify(all.map(r => r.dayOfWeek)))
  await prisma.$disconnect()
}
main()
