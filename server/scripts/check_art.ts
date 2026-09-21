import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
const rows = await p.schedule.findMany({ where: { name: '美术课' }, include: { child: true }, orderBy: { createdAt: 'desc' }, take: 3 })
for (const s of rows) console.log(s.name, s.dayOfWeek, s.startTime, '| child:', s.child?.name, '| childId:', s.childId)
}
main().then(() => p.$disconnect())
