import Koa from 'koa'
import { router } from './routes'
import { errorHandler } from './middleware/errorHandler'
import { startDailyTaskCron, generateDailyTasks } from './cron/dailyTask'
import * as fs from 'fs'
import * as path from 'path'

const app = new Koa()

startDailyTaskCron()

// 启动时自动补齐今天的任务（防止 cron 00:15 时机器关机/休眠导致漏生成）
generateDailyTasks().catch(e => console.error('[Startup] Failed to backfill today tasks:', e))

app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${new Date().toISOString()} ${ctx.method} ${ctx.url} → ${ctx.status} (${ms}ms)`)
  if (ctx.status >= 400) {
    console.log(`  Error body: ${JSON.stringify(ctx.body)}`)
  }
})

app.use(errorHandler)

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*')
  ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (ctx.method === 'OPTIONS') {
    ctx.status = 204
    return
  }
  
  await next()
})

app.use(async (ctx, next) => {
  if (ctx.request.headers['content-type'] === 'application/json') {
    try {
      const chunks: Buffer[] = []
      for await (const chunk of ctx.req) {
        chunks.push(chunk)
      }
      const body = Buffer.concat(chunks).toString()
      if (body && body.length < 10 * 1024 * 1024) { // 10MB limit
        ctx.request.body = JSON.parse(body)
      }
    } catch (e) {
      // ignore parse errors
    }
  }
  await next()
})

// Serve avatar files
app.use(async (ctx, next) => {
  if (ctx.path.startsWith('/uploads/')) {
    const filepath = path.join(__dirname, '..', ctx.path)
    if (fs.existsSync(filepath)) {
      ctx.type = 'image/jpeg'
      ctx.body = fs.createReadStream(filepath)
      return
    }
  }
  await next()
})

app.use(router.routes())
app.use(router.allowedMethods())

app.use(async (ctx, next) => {
  if (ctx.path === '/health') {
    ctx.body = { code: 0, message: 'ok', data: { status: 'running' } }
    return
  }
  await next()
})

const PORT = Number(process.env.CLSMGR_BACKEND_PORT || 3000)
const HOST = process.env.CLSMGR_HOST || '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`)
})

export default app
