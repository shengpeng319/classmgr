import * as cron from 'node-cron'
import { prisma } from '../utils/prisma'
import { sendClassRemind } from '../services/wxNotice'

// 今天某家庭的家长已发过？lastNotifyDate = today
function alreadyNotified(user: { lastNotifyDate: string | null }, today: string) {
  return user.lastNotifyDate === today
}

export async function scanAndRemind() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const dow = String(now.getDay())

  // 今天所有有效课程
  const schedules = await prisma.schedule.findMany({
    where: {
      isActive: true,
      isDailyTask: false,
      dayOfWeek: { contains: dow },
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    },
    include: { child: { include: { family: { include: { users: true } } } } }
  })

  // 按家庭分组，算每家第一条课的提醒时间
  const byFamily = new Map<string, typeof schedules>()
  for (const s of schedules) {
    if (!s.child?.family) continue
    const fid = s.child.familyId!
    if (!byFamily.has(fid)) byFamily.set(fid, [])
    byFamily.get(fid)!.push(s)
  }

  for (const [fid, famSchedules] of byFamily) {
    // 解析 startTime → 排序找第一条
    const sorted = famSchedules
      .map(s => {
        const [h, m] = (s.startTime || '00:00').split(':').map(Number)
        return { s, startMin: h * 60 + m }
      })
      .filter(x => x.startMin + 30 > nowMin) // 只看还没下课太久的
      .sort((a, b) => a.startMin - b.startMin)
    if (sorted.length === 0) continue

    const first = sorted[0]
    const family = first.s.child!.family!
    const remindMin = family.users[0]?.remindMinutes ?? 30
    const remindAt = first.startMin - remindMin
    if (nowMin !== remindAt) continue // 只在提醒时刻那一分钟发

    const lessons = sorted
      .map(x => `${x.s.startTime} ${x.s.name}${x.s.child?.name ? '(' + x.s.child.name + ')' : ''}`)
      .join('，')
    const firstLesson = `${first.s.startTime} ${first.s.name}${first.s.child?.name ? ' - ' + first.s.child.name : ''}`

    for (const u of family.users) {
      if (!u.notifyEnabled || alreadyNotified(u, today)) continue
      const ok = await sendClassRemind(u.id, firstLesson, lessons, remindMin)
      if (ok) {
        await prisma.user.update({ where: { id: u.id }, data: { lastNotifyDate: today } })
        console.log(`[ClassRemind] sent to ${u.username}: ${firstLesson}`)
      }
    }
  }
}

export function startClassRemindCron() {
  cron.schedule('* * * * *', scanAndRemind, { timezone: 'Asia/Shanghai' })
  console.log('[Cron] Class remind cron scheduled every minute')
}
