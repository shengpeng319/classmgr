import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  try {
    const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
    const paFam = await p.family.create({ data: { name: 'pengadmin家' } })
    console.log('created family', paFam.id)
  } catch (e: any) {
    console.log('SHORT_ERR:', e.message.split('\n').filter(l => l.includes('Invalid') || l.includes('Argument') || l.includes('constraint')).join(' | ').slice(0, 300))
  }
}
main().then(() => p.$disconnect())
