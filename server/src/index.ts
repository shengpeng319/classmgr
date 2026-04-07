import Koa from 'koa'
import { router } from './routes'
import { errorHandler } from './middleware/errorHandler'
import { startDailyTaskCron } from './cron/dailyTask'
import * as fs from 'fs'
import * as path from 'path'

const app = new Koa()

startDailyTaskCron()

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

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
