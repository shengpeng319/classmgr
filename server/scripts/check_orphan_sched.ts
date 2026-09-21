import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const s = await p.schedule.findFirst({ where: { childId: null }, select: { id: true, name: true, userId: true, isActive: true } })
  console.log('orphan schedule:', JSON.stringify(s))
  if (s) {
    const u = await p.user.findUnique({ where: { id: s.userId }, select: { username: true } })
    console.log('owner:', u?.username)
  }
  await p.$disconnect()
}
main()
