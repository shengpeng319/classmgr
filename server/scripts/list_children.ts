import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const fams = await p.family.findMany({ include: { children: true } })
  for (const f of fams) {
    console.log('Family:', f.name, f.id)
    for (const c of f.children) console.log('  Child:', c.name, c.id)
  }
  const users = await p.user.findMany({ select: { username: true, role: true, familyId: true } })
  console.log('Users:', JSON.stringify(users))
  await p.$disconnect()
}
main()
