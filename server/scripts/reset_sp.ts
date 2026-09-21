import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const p = new PrismaClient()
async function main() {
  await p.user.update({ where: { username: 'sp' }, data: { password: bcrypt.hashSync('Sp2026!', 10) } })
  console.log('sp reset ok')
}
main().then(() => p.$disconnect())
