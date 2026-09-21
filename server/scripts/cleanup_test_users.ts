import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const users = await p.user.findMany({ where: { username: { in: ['test_dad', 'test_solo'] } } })
  for (const u of users) {
    await p.pointRecord.deleteMany({ where: { userId: u.id } })
    await p.user.delete({ where: { id: u.id } })
  }
  const soloFam = await p.family.findFirst({ where: { name: { in: ['test_solo的家', '测试家改名'] } } })
  if (soloFam && (await p.user.count({ where: { familyId: soloFam.id } })) === 0) {
    await p.family.delete({ where: { id: soloFam.id } })
  }
  console.log('cleaned')
}
main().then(() => p.$disconnect())
