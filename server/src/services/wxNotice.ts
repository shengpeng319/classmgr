import { prisma } from '../utils/prisma'

const APPID = process.env.WX_APPID || ''
const SECRET = process.env.WX_SECRET || ''
const TEMPLATE_ID = process.env.WX_TEMPLATE_ID || ''
let accessToken: { token: string; exp: number } | null = null

// code → openid（wx.login）
export async function codeToOpenid(code: string): Promise<string | null> {
  if (!APPID || !SECRET) return null
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${APPID}&secret=${SECRET}&js_code=${code}&grant_type=authorization_code`
  try {
    const res = await fetch(url)
    const data: any = await res.json()
    return data.openid || null
  } catch {
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  if (!APPID || !SECRET) return null
  if (accessToken && accessToken.exp > Date.now()) return accessToken.token
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`
  try {
    const res = await fetch(url)
    const data: any = await res.json()
    if (!data.access_token) return null
    accessToken = { token: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 }
    return accessToken.token
  } catch {
    return null
  }
}

// 发一条订阅消息，成功扣额度
export async function sendClassRemind(userId: string, firstLesson: string, lessons: string, remindMin: number): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.openid || user.msgQuota <= 0 || !TEMPLATE_ID) return false
  const token = await getAccessToken()
  if (!token) return false
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const body = {
    touser: user.openid,
    template_id: TEMPLATE_ID,
    page: 'pages/schedule/schedule',
    data: {
      thing1: { value: '今日课程提醒' },
      thing2: { value: firstLesson.slice(0, 20) },
      time3: { value: `${pad(now.getHours())}:${pad(now.getMinutes())}` },
      thing4: { value: lessons.slice(0, 20) }
    }
  }
  try {
    const res = await fetch(`https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data: any = await res.json()
    if (data.errcode === 0) {
      await prisma.user.update({ where: { id: userId }, data: { msgQuota: { decrement: 1 } } })
      return true
    }
    console.log('[wxNotice] send failed:', data.errcode, data.errmsg)
    return false
  } catch (e) {
    console.error('[wxNotice] send error', e)
    return false
  }
}
