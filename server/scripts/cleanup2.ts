import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const u = await p.user.findUnique({ where: { username: 'test_dad2' } })
  if (u) {
    await p.pointRecord.deleteMany({ where: { userId: u.id } })
    await p.user.delete({ where: { id: u.id } })
  }
  console.log('cleaned')
}
main().then(() => p.$disconnect())
