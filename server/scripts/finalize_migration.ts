import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const fam = await p.family.findFirstOrThrow()
  // 1. 删垃圾 Child（user/probe 空档案）
  for (const name of ['user', 'probe']) {
    const c = await p.child.findFirst({ where: { familyId: fam.id, name } })
    if (c) {
      await p.task.updateMany({ where: { childId: c.id }, data: { childId: null } })
      await p.child.delete({ where: { id: c.id } })
      console.log('deleted junk child:', name)
    }
  }
  // 2. 建"爸爸"档案承接 sp 遗留任务
  let dad = await p.child.findFirst({ where: { familyId: fam.id, name: '爸爸' } })
  if (!dad) dad = await p.child.create({ data: { familyId: fam.id, name: '爸爸', gender: 'male' } })
  const r = await p.task.updateMany({ where: { childId: null }, data: { childId: dad.id } })
  console.log('orphan tasks ->', dad.name, ':', r.count)
  // 3. sp 归入家庭
  await p.user.updateMany({ where: { familyId: null }, data: { familyId: fam.id } })
  // 断言
  const tables = ['task', 'schedule', 'pointRecord', 'studentCard', 'record'] as const
  for (const t of tables) {
    const total = await (p as any)[t].count()
    const filled = await (p as any)[t].count({ where: { childId: { not: null } } })
    console.log(t, `total=${total} filled=${filled}`, total === filled ? 'OK' : 'FAIL')
  }
  await p.$disconnect()
}
main()
