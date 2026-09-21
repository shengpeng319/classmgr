import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const p = new PrismaClient()
async function main() {
  for (const u of await p.user.findMany({ select: { username: true, password: true, updatedAt: true } })) {
    console.log(u.username, u.password.slice(0, 12), 'updated:', u.updatedAt.toISOString())
    for (const pw of ['Peng2026!', 'admin123', 'Wang2026!']) {
      if (await bcrypt.compare(pw, u.password)) console.log('  ^ matches', pw)
    }
  }
}
main().then(() => p.$disconnect())
