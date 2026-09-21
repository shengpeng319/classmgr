import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  // 给存量家庭补邀请码
  const fams = await p.family.findMany({ where: { inviteCode: '' } })
  for (const f of fams) {
    await p.family.update({ where: { id: f.id }, data: { inviteCode: genCode() } })
  }
  const all = await p.family.findMany({ select: { name: true, inviteCode: true } })
  console.log(JSON.stringify(all))
  function genCode(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
    let c = ''
    for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)]
    return c
  }
}
main().then(() => p.$disconnect())
