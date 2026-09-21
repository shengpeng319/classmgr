import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
const me = await p.user.findUnique({ where: { username: 'pengadmin' }, select: { id: true, familyId: true } })
console.log('me:', me)
const kids = me?.familyId ? await p.child.findMany({ where: { familyId: me.familyId, name: { contains: 'Sophia' } } }) : []
console.log('kids:', kids.map(k => k.name))
}
main().then(() => p.$disconnect())
