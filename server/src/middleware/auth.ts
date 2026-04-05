import { Context, Next } from 'koa'
import { verifyToken, TokenPayload } from '../utils/jwt'

export interface AuthState {
  user: TokenPayload
}

export const authMiddleware = async (ctx: Context, next: Next) => {
  const authHeader = ctx.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Unauthorized: No token provided', data: null }
    return
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    ctx.status = 401
    ctx.body = { code: 401, message: 'Unauthorized: Invalid token', data: null }
    return
  }

  ctx.state.user = payload
  await next()
}

export const adminMiddleware = async (ctx: Context, next: Next) => {
  const user = ctx.state.user as TokenPayload | undefined

  if (!user || user.role !== 'admin') {
    ctx.status = 403
    ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null }
    return
  }

  await next()
}
