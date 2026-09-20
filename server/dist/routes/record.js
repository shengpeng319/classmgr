"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordRoutes = recordRoutes;
const prisma_1 = require("../utils/prisma");
function recordRoutes(router) {
    router.get('/records', async (ctx) => {
        const { userId, courseId, startDate, endDate } = ctx.query;
        const where = {};
        if (userId)
            where.userId = userId;
        if (courseId)
            where.courseId = courseId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const records = await prisma_1.prisma.record.findMany({
            where,
            orderBy: { date: 'desc' },
            include: { user: true }
        });
        ctx.body = { code: 0, message: 'ok', data: records };
    });
    router.post('/records', async (ctx) => {
        const { userId, courseId, date, status, note, pointsEarned } = ctx.request.body;
        const record = await prisma_1.prisma.record.create({
            data: { userId, courseId, date: new Date(date), status, note, pointsEarned: pointsEarned || 0 }
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: record };
    });
    router.put('/records/:id', async (ctx) => {
        const data = ctx.request.body;
        const record = await prisma_1.prisma.record.update({
            where: { id: ctx.params.id },
            data
        });
        ctx.body = { code: 0, message: 'ok', data: record };
    });
    router.delete('/records/:id', async (ctx) => {
        await prisma_1.prisma.record.delete({
            where: { id: ctx.params.id }
        });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
}
//# sourceMappingURL=record.js.map