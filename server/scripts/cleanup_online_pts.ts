import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const s = await p.child.findFirst({ where: { name: 'Sophia' } })
  const d = await p.pointRecord.deleteMany({ where: { childId: s!.id, taskTitle: 'AI 助手调整' } })
  await p.child.update({ where: { id: s!.id }, data: { points: 0 } })
  console.log('deleted records:', d.count, '| points reset 0')
}
main().then(() => p.$disconnect())
