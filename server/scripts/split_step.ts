import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function step(label: string, fn: () => Promise<any>) {
  try { await fn(); console.log('OK', label) }
  catch (e: any) { console.log('ERR', label, e.code || '', String(e.message).slice(0, 150).replace(/\n/g, ' ')) }
}
async function main() {
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  const sp = await p.user.findUnique({ where: { username: 'sp' } })
  const famId = pa!.familyId!
  await step('pa self', () => p.user.update({ where: { id: pa!.id }, data: { familyId: famId } }))
  await step('pengadmin2', () => p.user.update({ where: { username: 'pengadmin2' }, data: { familyId: famId } }))
  await step('admin', () => p.user.update({ where: { username: 'admin' }, data: { familyId: famId } }))
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  console.log('dad:', dad?.id.slice(0,8), dad?.familyId.slice(0,8), 'target:', famId.slice(0,8))
  if (dad && dad.familyId !== famId) await step('dad move', () => p.child.update({ where: { id: dad.id }, data: { familyId: famId } }))
}
main().then(() => p.$disconnect())
