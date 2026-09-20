"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cardRoutes = cardRoutes;
const prisma_1 = require("../utils/prisma");
function cardRoutes(router) {
    router.get('/cards', async (ctx) => {
        const cards = await prisma_1.prisma.card.findMany({
            where: { isActive: true },
            orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
        });
        ctx.body = { code: 0, message: 'ok', data: cards };
    });
    router.get('/cards/:id', async (ctx) => {
        const card = await prisma_1.prisma.card.findUnique({
            where: { id: ctx.params.id }
        });
        if (!card) {
            ctx.status = 404;
            ctx.body = { code: 404, message: 'Card not found', data: null };
            return;
        }
        ctx.body = { code: 0, message: 'ok', data: card };
    });
    router.post('/cards', async (ctx) => {
        const { name, description, rarity, image, pointsCost, stock } = ctx.request.body;
        const card = await prisma_1.prisma.card.create({
            data: { name, description, rarity, image, pointsCost, stock: stock ?? -1 }
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: card };
    });
    router.put('/cards/:id', async (ctx) => {
        const data = ctx.request.body;
        const card = await prisma_1.prisma.card.update({
            where: { id: ctx.params.id },
            data
        });
        ctx.body = { code: 0, message: 'ok', data: card };
    });
    router.delete('/cards/:id', async (ctx) => {
        await prisma_1.prisma.card.update({
            where: { id: ctx.params.id },
            data: { isActive: false }
        });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
}
//# sourceMappingURL=card.js.map