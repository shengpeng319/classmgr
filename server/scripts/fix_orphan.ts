import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const fam = await p.family.findFirstOrThrow()
  const dad = await p.child.findFirstOrThrow({ where: { familyId: fam.id, name: '爸爸' } })
  const r = await p.task.updateMany({ where: { childId: null }, data: { childId: dad.id } })
  console.log('orphan tasks ->', dad.name, ':', r.count)
  await p.$disconnect()
}
main()
