import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const sp = await p.user.findUnique({ where: { username: 'sp' } })
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  if (!sp || !pa) throw new Error('user missing')
  // pengadmin 的新家
  const paFam = await p.family.create({ data: { name: 'pengadmin家' } })
  await p.user.update({ where: { id: pa.id }, data: { familyId: paFam.id } })
  await p.user.update({ where: { username: 'pengadmin2' }, data: { familyId: paFam.id } })
  await p.user.update({ where: { username: 'admin' }, data: { familyId: paFam.id } })
  // 爸爸挪去 pengadmin 家
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  if (dad) {
    await p.child.update({ where: { id: dad.id }, data: { familyId: paFam.id } })
    await p.task.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
    await p.schedule.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
    await p.pointRecord.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
  }
  console.log('sp family(盛鹏家):', (await p.child.findMany({ where: { familyId: sp.familyId! } })).map(k => k.name))
  console.log('pa family:', (await p.child.findMany({ where: { familyId: paFam.id } })).map(k => k.name))
}
main().then(() => p.$disconnect())
