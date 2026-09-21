import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  await p.family.update({ where: { id: '1f26cbd7-a73c-4857-8144-f9b000e4619b' }, data: { name: '盛鹏家' } })
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  const fams = await p.family.findMany({ include: { users: true, children: true } })
  for (const f of fams) {
    if (f.name === 'pengadmin家' && f.users.length === 0 && f.children.length === 0) {
      await p.family.delete({ where: { id: f.id } })
      console.log('deleted junk family', f.id.slice(0, 8))
    }
  }
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  if (pa && dad) await p.task.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
  const after = await p.family.findMany({ include: { users: { select: { username: true } }, children: { select: { name: true } } } })
  for (const f of after) console.log(`${f.name}: users=[${f.users.map(u => u.username).join(',')}] children=[${f.children.map(c => c.name).join(',')}]`)
}
main().then(() => p.$disconnect())
