import { prisma } from '../src/utils/prisma'

async function main() {
  const kw = 'Sophia'
  const candidates = await prisma.user.findMany({
    where: {
      role: { not: 'admin' },
      OR: [{ name: { contains: kw } }, { username: { contains: kw } }]
    },
    select: { id: true, name: true, username: true }
  })
  console.log('candidates:', JSON.stringify(candidates))
  process.exit(0)
}
main()
