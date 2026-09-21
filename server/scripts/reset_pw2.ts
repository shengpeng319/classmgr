import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const p = new PrismaClient()
async function main() {
  await p.user.update({ where: { username: 'pengadmin' }, data: { password: bcrypt.hashSync('Peng2026!', 10) } })
  const u = await p.user.findUnique({ where: { username: 'pengadmin' } })
  console.log('verify:', await bcrypt.compare('Peng2026!', u!.password), u!.updatedAt.toISOString())
}
main().then(() => p.$disconnect())
