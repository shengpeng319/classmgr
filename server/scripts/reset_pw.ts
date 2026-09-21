import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const p = new PrismaClient()
async function main() {
  const pa = bcrypt.hashSync('Peng2026!', 10)
  await p.user.update({ where: { username: 'pengadmin' }, data: { password: pa } })
  console.log('pengadmin reset ok')
  // sp 密码未知 hash——重置为 sp 拿得到的新密码，交付时告知 Peng
  const sp = await p.user.findUnique({ where: { username: 'sp' } })
  console.log('sp hash prefix:', sp?.password?.slice(0, 10))
}
main().then(() => p.$disconnect())
