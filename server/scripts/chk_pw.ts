import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const p = new PrismaClient()
async function main() {
  const pa = await p.user.findUnique({ where: { username: 'pengadmin' } })
  console.log('pw hash prefix:', pa?.password?.slice(0, 10))
  console.log('Peng2026! match:', await bcrypt.compare('Peng2026!', pa?.password || ''))
  console.log('admin123 match:', await bcrypt.compare('admin123', pa?.password || ''))
}
main().then(() => p.$disconnect())
