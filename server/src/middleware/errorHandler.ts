import { Context, Next } from 'koa'

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (error: any) {
    ctx.status = error.status || 500
    ctx.body = {
      code: error.status || 500,
      message: error.message || 'Internal Server Error',
      data: null
    }
  }
}
