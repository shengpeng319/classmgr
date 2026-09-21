import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const s = await p.schedule.findFirst({ where: { childId: null } })
  if (s) { await p.schedule.delete({ where: { id: s.id } }); console.log('deleted junk schedule:', s.name) }
  for (const t of ['task', 'schedule', 'pointRecord', 'studentCard', 'record'] as const) {
    const total = await (p as any)[t].count()
    const filled = await (p as any)[t].count({ where: { childId: { not: null } } })
    console.log(t, `total=${total} filled=${filled}`, total === filled ? 'OK' : 'FAIL')
  }
  await p.$disconnect()
}
main()
