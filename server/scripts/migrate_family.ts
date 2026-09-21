// 批1 数据迁移：单家庭 User 模型 → Family + Child 档案
// 用法: cd server && npx tsx scripts/migrate_family.ts
// 幂等：已迁移（childId 非空）的行自动跳过。
import { prisma } from '../src/utils/prisma'

const TABLES = ['task', 'schedule', 'pointRecord', 'studentCard', 'record'] as const

async function main() {
  // 1. 建"盛鹏家"，sp 为 admin 成员
  const sp = await prisma.user.findUnique({ where: { username: 'sp' } })
  if (!sp) throw new Error('找不到 sp 账号，无法建盛鹏家')

  let family = await prisma.family.findFirst({ where: { name: '盛鹏家' } })
  if (!family) family = await prisma.family.create({ data: { name: '盛鹏家' } })

  await prisma.user.update({ where: { id: sp.id }, data: { familyId: family.id } })

  // 2. role=user 的旧孩子账号 → Child 档案（User 行保留但不再使用）
  const oldChildUsers = await prisma.user.findMany({ where: { role: 'user' } })
  for (const u of oldChildUsers) {
    let child = await prisma.child.findFirst({ where: { familyId: family.id, name: u.name || u.username } })
    if (!child) {
      child = await prisma.child.create({
        data: {
          familyId: family.id,
          name: u.name || u.username,
          gender: u.gender,
          avatar: u.avatar,
          points: u.points,
        },
      })
      console.log(`  Child 档案: ${child.name} (from user ${u.username})`)
    }
    // 业务数据全部转挂 Child（userId 列保留不删）
    const r1 = await prisma.task.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    const r2 = await prisma.schedule.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    const r3 = await prisma.pointRecord.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    const r4 = await prisma.studentCard.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    const r5 = await prisma.record.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    const r6 = await prisma.courseStudent.updateMany({ where: { userId: u.id, childId: null }, data: { childId: child.id } })
    console.log(`  ${u.username}: task=${r1.count} schedule=${r2.count} pointRecord=${r3.count} studentCard=${r4.count} record=${r5.count} courseStudent=${r6.count}`)
  }

  // 3. admin 名下遗留数据（历史以 admin 身份产生的卡/课表）→ 建"爸爸"Child 档案承接，避免丢数据
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (adminUser) {
    const orphan = await prisma.studentCard.count({ where: { userId: adminUser.id, childId: null } })
      + await prisma.schedule.count({ where: { userId: adminUser.id, childId: null } })
    if (orphan > 0) {
      let dad = await prisma.child.findFirst({ where: { familyId: family.id, name: adminUser.name || 'admin' } })
      if (!dad) {
        dad = await prisma.child.create({
          data: { familyId: family.id, name: adminUser.name || 'admin', gender: 'male', points: adminUser.points },
        })
        console.log(`  Child 档案: ${dad.name} (from admin 遗留数据)`)
      }
      await prisma.task.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      await prisma.schedule.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      await prisma.pointRecord.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      await prisma.studentCard.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      await prisma.record.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      await prisma.courseStudent.updateMany({ where: { userId: adminUser.id, childId: null }, data: { childId: dad.id } })
      console.log(`  admin 遗留数据 → ${dad.name} 档案`)
    }
    await prisma.user.update({ where: { id: adminUser.id }, data: { familyId: family.id } })
  }

  // 4. 其余 admin/parent 用户也归入盛鹏家（admin 兼家长，本环境只有这一个家庭）
  await prisma.user.updateMany({ where: { familyId: null }, data: { familyId: family.id } })
  // role=user → parent（User 行保留但不再使用）
  await prisma.user.updateMany({ where: { role: 'user' }, data: { role: 'parent' } })

  // 4. 验证断言：每张业务表 childId 非空率 = 原 userId 非空率（应均为 100%）
  console.log('\n=== 迁移断言 ===')
  let allPass = true
  for (const t of TABLES) {
    const total = await (prisma as any)[t].count()
    const withChild = await (prisma as any)[t].count({ where: { childId: { not: null } } })
    // userId 列为 NOT NULL，非空率恒等于 total；断言 childId 非空数 == total == userId 非空数
    const withUser = total
    const pass = withChild === withUser && withChild === total
    if (!pass) allPass = false
    console.log(`${t}: total=${total} childId非空=${withChild} userId非空=${withUser} ${pass ? '✅' : '❌'}`)
  }
  const csTotal = await prisma.courseStudent.count()
  const csChild = await prisma.courseStudent.count({ where: { childId: { not: null } } })
  const csPass = csTotal === csChild
  if (!csPass) allPass = false
  console.log(`courseStudent: total=${csTotal} childId非空=${csChild} ${csPass ? '✅' : '❌'}`)

  if (!allPass) {
    console.error('断言失败！')
    process.exit(1)
  }
  console.log('\n迁移完成，断言全绿 ✅')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => {
    await prisma.$disconnect()
  })
