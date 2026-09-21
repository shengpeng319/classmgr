import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  // 1. sp role: user → parent
  await p.user.update({ where: { username: 'sp' }, data: { role: 'parent' } })
  // 2. pengadmin 独立新家
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  const paFam = pa?.familyId
    ? await p.family.update({ where: { id: pa.familyId }, data: { name: 'pengadmin家' } })
    : await p.family.create({ data: { name: 'pengadmin家' } })
  await p.user.update({ where: { username: 'pengadmin' }, data: { familyId: paFam.id } })
  await p.user.update({ where: { username: 'pengadmin2' }, data: { familyId: paFam.id } })
  await p.user.update({ where: { username: 'admin' }, data: { familyId: paFam.id } })
  // 3. 爸爸挪到 pengadmin 家
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  if (dad) await p.child.update({ where: { id: dad.id }, data: { familyId: paFam.id } })
  // 4. 爸爸名下业务数据的 userId 冗余列重指到 pengadmin
  if (dad) {
    await p.task.updateMany({ where: { childId: dad.id }, data: { userId: pa!.id } })
    await p.schedule.updateMany({ where: { childId: dad.id }, data: { userId: pa!.id } })
    await p.pointRecord.updateMany({ where: { childId: dad.id }, data: { userId: pa!.id } })
  }
  const sp = await p.user.findUnique({ where: { username: 'sp' } })
  console.log('sp family:', (await p.child.findMany({ where: { familyId: sp!.familyId! } })).map(k => k.name))
  console.log('pa family:', (await p.child.findMany({ where: { familyId: paFam.id } })).map(k => k.name))
}
main().then(() => p.$disconnect())
