import Router from 'koa-router'
import { prisma } from '../utils/prisma'

export function lotteryRoutes(router: Router) {
  router.post('/lottery/draw', async (ctx) => {
    const { studentId } = ctx.request.body as { studentId: string }

    const student = await prisma.student.findUnique({
      where: { id: studentId }
    })

    if (!student) {
      ctx.status = 404
      ctx.body = { code: 404, message: 'Student not found', data: null }
      return
    }

    const availableCards = await prisma.card.findMany({
      where: {
        isActive: true,
        OR: [
          { stock: -1 },
          { stock: { gt: 0 } }
        ]
      }
    })

    if (availableCards.length === 0) {
      ctx.body = { code: 400, message: 'No cards available', data: null }
      return
    }

    const affordableCards = availableCards.filter(card => card.pointsCost <= student.points)

    if (affordableCards.length === 0) {
      ctx.body = { code: 400, message: 'Not enough points', data: null }
      return
    }

    const randomIndex = Math.floor(Math.random() * affordableCards.length)
    const drawnCard = affordableCards[randomIndex]

    await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId },
        data: { points: { decrement: drawnCard.pointsCost } }
      }),
      prisma.card.update({
        where: { id: drawnCard.id },
        data: {
          stock: drawnCard.stock > 0 ? { decrement: 1 } : drawnCard.stock
        }
      }),
      prisma.studentCard.create({
        data: {
          studentId,
          cardId: drawnCard.id
        }
      })
    ])

    ctx.body = { code: 0, message: 'ok', data: drawnCard }
  })

  router.get('/lottery/history/:studentId', async (ctx) => {
    const { studentId } = ctx.params
    const studentCards = await prisma.studentCard.findMany({
      where: { studentId },
      include: { card: true },
      orderBy: { drawnAt: 'desc' }
    })
    ctx.body = { code: 0, message: 'ok', data: studentCards }
  })
}
