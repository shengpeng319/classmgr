import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const fams = await p.family.findMany({ include: { users: { select: { username: true } }, children: { select: { name: true } } } })
  for (const f of fams) console.log(`${f.name} (${f.id.slice(0,8)}): users=[${f.users.map(u => u.username)}] children=[${f.children.map(c => c.name)}]`)
  // 爸爸业务数据 userId 是否已重指
  const dad = await p.child.findFirst({ where: { name: '爸爸' } })
  if (dad) {
    const t = await p.task.findFirst({ where: { childId: dad.id }, select: { userId: true } })
    const u = t ? await p.user.findUnique({ where: { id: t.userId }, select: { username: true } }) : null
    console.log('dad tasks userId ->', u?.username ?? t?.userId.slice(0,8) ?? 'none')
  }
  // 无归属检查
  console.log('孤儿任务:', await p.task.count({ where: { childId: null } }), '| 孤儿课程:', await p.schedule.count({ where: { childId: null } }))
}
main().then(() => p.$disconnect())
