import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
const swim = await p.schedule.findMany({
  where: { name: { contains: '游泳' } },
  include: { child: true },
  orderBy: { id: 'desc' },
  take: 10
})
console.log(JSON.stringify(swim.map(s => ({ id: s.id, name: s.name, child: s.child?.name, day: s.dayOfWeek, start: s.startTime, end: s.endTime, active: s.isActive })), null, 1))
// 今天=2026-09-21 周一，周二=dayOfWeek 2
const tue = await p.schedule.findMany({ where: { child: { name: 'Sophia' }, dayOfWeek: "2" } })
console.log('Sophia周二课:', tue.map(s => s.name).join(', '))
}
main().then(() => p.$disconnect())
