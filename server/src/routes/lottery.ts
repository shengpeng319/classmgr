import Router from 'koa-router'
import { prisma } from '../utils/prisma'
import { authMiddleware } from '../middleware/auth'

export function lotteryRoutes(router: Router) {
  // Get or create student for current user
  router.get('/lottery/student', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId

    let student = await prisma.student.findFirst({
      where: { userId }
    })

    if (!student) {
      // Create a new student for this user
      student = await prisma.student.create({
        data: {
          name: '默认学生',
          points: 100, // Starting points for new users
          userId
        }
      })
    }

    ctx.body = { code: 0, message: 'ok', data: student }
  })

  // Get active cards (available for drawing)
  router.get('/lottery/cards', async (ctx) => {
    const cards = await prisma.card.findMany({
      where: {
        isActive: true,
        OR: [
          { stock: -1 },
          { stock: { gt: 0 } }
        ]
      },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
    })
    ctx.body = { code: 0, message: 'ok', data: cards }
  })

  // Draw a card
  router.post('/lottery/draw', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId

    // Get or create student
    let student = await prisma.student.findFirst({
      where: { userId }
    })

    if (!student) {
      student = await prisma.student.create({
        data: {
          name: '默认学生',
          points: 100,
          userId
        }
      })
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
      ctx.status = 400
      ctx.body = { code: 400, message: '暂无可抽取的卡片', data: null }
      return
    }

    const affordableCards = availableCards.filter(card => card.pointsCost <= student.points)

    if (affordableCards.length === 0) {
      ctx.status = 400
      ctx.body = { code: 400, message: '积分不足，无法抽取', data: null }
      return
    }

    // Weighted random selection based on rarity
    const rarityWeights: Record<string, number> = {
      common: 50,
      rare: 30,
      epic: 15,
      legendary: 5
    }
    
    const weightedCards: { card: typeof availableCards[0], weight: number }[] = []
    let totalWeight = 0
    for (const card of affordableCards) {
      const weight = rarityWeights[card.rarity] || 10
      weightedCards.push({ card, weight })
      totalWeight += weight
    }
    
    let random = Math.random() * totalWeight
    let drawnCard = affordableCards[0]
    for (const { card, weight } of weightedCards) {
      random -= weight
      if (random <= 0) {
        drawnCard = card
        break
      }
    }

    // Perform transaction
    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
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
          studentId: student.id,
          cardId: drawnCard.id
        }
      })
    ])

    // Get updated student and return drawn card
    const updatedStudent = await prisma.student.findUnique({
      where: { id: student.id }
    })

    ctx.body = {
      code: 0,
      message: 'ok',
      data: {
        card: drawnCard,
        remainingPoints: updatedStudent?.points ?? 0
      }
    }
  })

  // Get user's owned cards
  router.get('/lottery/my-cards', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId

    const student = await prisma.student.findFirst({
      where: { userId }
    })

    if (!student) {
      ctx.body = { code: 0, message: 'ok', data: [] }
      return
    }

    const studentCards = await prisma.studentCard.findMany({
      where: { studentId: student.id },
      include: { card: true },
      orderBy: { drawnAt: 'desc' }
    })

    ctx.body = { code: 0, message: 'ok', data: studentCards }
  })

  // Get lottery history
  router.get('/lottery/history', authMiddleware, async (ctx) => {
    const userId = ctx.state.user.userId

    const student = await prisma.student.findFirst({
      where: { userId }
    })

    if (!student) {
      ctx.body = { code: 0, message: 'ok', data: [] }
      return
    }

    const studentCards = await prisma.studentCard.findMany({
      where: { studentId: student.id },
      include: { card: true },
      orderBy: { drawnAt: 'desc' }
    })

    ctx.body = { code: 0, message: 'ok', data: studentCards }
  })
}
