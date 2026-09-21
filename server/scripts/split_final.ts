import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const sp = await p.user.findUnique({ where: { username: 'sp' } })
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  if (!sp || !pa) throw new Error('user missing')
  const famId = pa.familyId!
  const famName = (await p.family.findUnique({ where: { id: famId } }))?.name
  console.log('pa family:', famName, famId.slice(0, 8))
  await p.user.update({ where: { id: pa.id }, data: { familyId: famId } })
  await p.user.update({ where: { username: 'pengadmin2' }, data: { familyId: famId } })
  await p.user.update({ where: { username: 'admin' }, data: { familyId: famId } })
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  if (dad && dad.familyId !== famId) {
    await p.child.update({ where: { id: dad.id }, data: { familyId: famId } })
    await p.task.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
    await p.schedule.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
    await p.pointRecord.updateMany({ where: { childId: dad.id }, data: { userId: pa.id } })
  }
  const famId2 = sp.familyId!
  console.log('sp family:', (await p.child.findMany({ where: { familyId: famId2 } })).map(k => k.name))
  console.log('pa family:', (await p.child.findMany({ where: { familyId: famId } })).map(k => k.name))
}
main().then(() => p.$disconnect()).catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(1) })
