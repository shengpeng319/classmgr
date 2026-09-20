"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lotteryRoutes = lotteryRoutes;
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
function lotteryRoutes(router) {
    // Get user info with points
    router.get('/lottery/info', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, avatar: true, points: true }
        });
        if (!user) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '用户不存在', data: null };
            return;
        }
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    // Get active cards (available for drawing)
    router.get('/lottery/cards', async (ctx) => {
        const cards = await prisma_1.prisma.card.findMany({
            where: {
                isActive: true,
                OR: [
                    { stock: -1 },
                    { stock: { gt: 0 } }
                ]
            },
            orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
        });
        ctx.body = { code: 0, message: 'ok', data: cards };
    });
    // Draw a card (free, no points deduction)
    router.post('/lottery/draw', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '用户不存在', data: null };
            return;
        }
        const availableCards = await prisma_1.prisma.card.findMany({
            where: {
                isActive: true,
                OR: [
                    { stock: -1 },
                    { stock: { gt: 0 } }
                ]
            }
        });
        if (availableCards.length === 0) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '暂无可抽取的卡牌', data: null };
            return;
        }
        // Weighted random selection based on rarity
        const rarityWeights = {
            common: 50,
            rare: 30,
            epic: 15,
            legendary: 5
        };
        const weightedCards = [];
        let totalWeight = 0;
        for (const card of availableCards) {
            const weight = rarityWeights[card.rarity] || 10;
            weightedCards.push({ card, weight });
            totalWeight += weight;
        }
        let random = Math.random() * totalWeight;
        let drawnCard = availableCards[0];
        for (const { card, weight } of weightedCards) {
            random -= weight;
            if (random <= 0) {
                drawnCard = card;
                break;
            }
        }
        // Perform transaction (free draw, no points deduction)
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.card.update({
                where: { id: drawnCard.id },
                data: {
                    stock: drawnCard.stock > 0 ? { decrement: 1 } : drawnCard.stock
                }
            }),
            prisma_1.prisma.studentCard.create({
                data: {
                    userId: userId,
                    cardId: drawnCard.id
                }
            })
        ]);
        ctx.body = {
            code: 0,
            message: 'ok',
            data: {
                card: drawnCard,
                remainingPoints: user.points
            }
        };
    });
    // Get user's owned cards
    router.get('/lottery/my-cards', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const userCards = await prisma_1.prisma.studentCard.findMany({
            where: { userId },
            include: { card: true },
            orderBy: { drawnAt: 'desc' }
        });
        ctx.body = { code: 0, message: 'ok', data: userCards };
    });
    // Get lottery history
    router.get('/lottery/history', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const userCards = await prisma_1.prisma.studentCard.findMany({
            where: { userId },
            include: { card: true },
            orderBy: { drawnAt: 'desc' }
        });
        ctx.body = { code: 0, message: 'ok', data: userCards };
    });
}
//# sourceMappingURL=lottery.js.map