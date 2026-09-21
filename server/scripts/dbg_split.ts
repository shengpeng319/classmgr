import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  try {
    await p.user.update({ where: { username: 'sp' }, data: { role: 'parent' } })
    console.log('sp role ok')
  } catch (e: any) { console.log('sp ERR:', e.message.slice(0, 300)) }
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  console.log('pa familyId:', pa?.familyId)
}
main().then(() => p.$disconnect())
