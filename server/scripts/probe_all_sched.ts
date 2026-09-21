import { prisma } from '../src/utils/prisma'

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, name: true, username: true } })
  for (const u of users) {
    const s = await prisma.schedule.findMany({ where: { userId: u.id, isActive: true }, orderBy: { name: 'asc' } })
    console.log(`--- ${u.username} (${u.name}):`)
    for (const x of s) console.log(`  ${x.name} [${x.dayOfWeek}] ${x.startTime}-${x.endTime} @${x.location} type=${x.type}`)
  }
  await prisma.$disconnect()
}
main()
