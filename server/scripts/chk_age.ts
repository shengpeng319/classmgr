import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const c = await p.child.findFirst()
  const r = await p.child.update({ where: { id: c!.id }, data: { age: 8 } })
  console.log('age write ok:', r.age)
  await p.child.update({ where: { id: c!.id }, data: { age: null } })
}
main().then(() => p.$disconnect())
