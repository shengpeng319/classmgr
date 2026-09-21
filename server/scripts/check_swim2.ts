import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
const rows = await p.schedule.findMany({ where: { name: { contains: '游泳' }, dayOfWeek: '2' }, include: { user: true, child: true }, orderBy: { createdAt: 'desc' } })
for (const s of rows) console.log(s.name, s.dayOfWeek, s.startTime + '-' + s.endTime, '| user:', s.user?.username, '| child:', s.child?.name, '| childId:', s.childId, '| created:', s.createdAt.toISOString())
const kids = await p.child.findMany()
console.log('Children:', kids.map(k => k.name + ':' + k.id.slice(0, 8)).join(', '))
}
main().then(() => p.$disconnect())
