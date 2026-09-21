// 课程表 → 手机系统日历（每周重复事件）。微信只提供写入，无删除/读取 API。
interface CalCourse {
  name: string
  dayOfWeek: string // "1,3" 0=周日
  startTime: string
  endTime: string
  location?: string
  childName?: string
}

const DAY_PREFIX = '〔课程〕'

// 下一个周X的日期（从明天起找，避免写到今天已过去的时段）
function nextDateFor(day: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== day) d.setDate(d.getDate() + 1)
  return d
}

/**
 * 写入日历。同一天多门课合并为一条事件。
 * 返回写入条数。
 */
export async function exportCoursesToCalendar(courses: CalCourse[], alarmOffsetMin = 30): Promise<number> {
  // 按 dayOfWeek 分组（同一天合并）
  const byDay = new Map<number, CalCourse[]>()
  for (const c of courses) {
    for (const dayStr of c.dayOfWeek.split(',')) {
      const day = Number(dayStr)
      if (Number.isNaN(day) || day < 0 || day > 6) continue
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(c)
    }
  }

  let written = 0
  for (const [day, list] of byDay) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime))
    const first = list[0]
    const [sh, sm] = first.startTime.split(':').map(Number)
    const [eh, em] = list[list.length - 1].endTime.split(':').map(Number)
    const start = nextDateFor(day)
    start.setHours(sh, sm, 0, 0)
    const end = new Date(start)
    end.setHours(eh, em, 0, 0)

    const title = list.length === 1
      ? `${DAY_PREFIX}${first.name}${first.childName ? '·' + first.childName : ''}`
      : `${DAY_PREFIX}${first.childName ? first.childName + '·' : ''}课程×${list.length}`
    const desc = list.length === 1
      ? (first.location ? `地点：${first.location}` : '')
      : list.map(c => `${c.startTime} ${c.name}${c.location ? '@' + c.location : ''}`).join('\n')

    await new Promise<void>((resolve) => {
      wx.addPhoneRepeatCalendar({
        title,
        startTime: Math.floor(start.getTime() / 1000),
        endTime: Math.floor(end.getTime() / 1000),
        description: desc,
        location: list.length === 1 ? (first.location || '') : '',
        alarm: true,
        alarmOffset: alarmOffsetMin * 60,
        repeatInterval: 'week',
        success: () => { written++; resolve() },
        fail: () => resolve() // 用户拒绝授权/单条失败不中断
      })
    })
  }
  return written
}
