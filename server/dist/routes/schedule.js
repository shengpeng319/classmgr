"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleRoutes = scheduleRoutes;
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
function scheduleRoutes(router) {
    // 获取当前用户的课程表
    router.get('/schedules', async (ctx) => {
        const authHeader = ctx.headers.authorization;
        const { startDate, endDate } = ctx.query;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Unauthorized', data: null };
            return;
        }
        const token = authHeader.substring(7);
        const tokenPayload = (0, jwt_1.verifyToken)(token);
        if (!tokenPayload) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Invalid token', data: null };
            return;
        }
        const weekStart = startDate ? new Date(startDate) : new Date();
        const weekEnd = endDate ? new Date(endDate) : new Date();
        const schedules = await prisma_1.prisma.schedule.findMany({
            where: {
                userId: tokenPayload.userId,
                isActive: true,
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: weekEnd } }
                        ]
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: weekStart } }
                        ]
                    }
                ]
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: [
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        ctx.body = { code: 0, message: 'ok', data: schedules };
    });
    // 获取指定用户的课程表（Admin）
    router.get('/admin/schedules', async (ctx) => {
        const { userId, startDate, endDate } = ctx.query;
        const authHeader = ctx.headers.authorization;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyToken)(token);
            isAdmin = payload?.role === 'admin';
        }
        if (!isAdmin) {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null };
            return;
        }
        const weekStart = startDate ? new Date(startDate) : new Date();
        const weekEnd = endDate ? new Date(endDate) : new Date();
        const where = {
            isActive: true,
            AND: [
                {
                    OR: [
                        { startDate: null },
                        { startDate: { lte: weekEnd } }
                    ]
                },
                {
                    OR: [
                        { endDate: null },
                        { endDate: { gte: weekStart } }
                    ]
                }
            ]
        };
        if (userId) {
            where.userId = userId;
        }
        const schedules = await prisma_1.prisma.schedule.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: [
                { userId: 'asc' },
                { dayOfWeek: 'asc' },
                { startTime: 'asc' }
            ]
        });
        ctx.body = { code: 0, message: 'ok', data: schedules };
    });
    // 创建课程表条目
    router.post('/admin/schedules', async (ctx) => {
        const { userId, name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, startDate, endDate } = ctx.request.body;
        const authHeader = ctx.headers.authorization;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyToken)(token);
            isAdmin = payload?.role === 'admin';
        }
        if (!isAdmin) {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null };
            return;
        }
        if (!userId || !name || !dayOfWeek || !startTime || !endTime || !type) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Missing required fields', data: null };
            return;
        }
        if (isDailyTask && (!points || points < 1)) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '当日任务需要设置积分值', data: null };
            return;
        }
        const schedule = await prisma_1.prisma.schedule.create({
            data: {
                userId,
                name,
                dayOfWeek,
                startTime,
                endTime,
                location,
                type,
                color: color || '#87CEEB',
                isDailyTask: isDailyTask || false,
                points: points || 1,
                startDate: startDate ? new Date(startDate + 'T00:00:00.000Z') : null,
                endDate: endDate ? new Date(endDate + 'T23:59:59.999Z') : null
            }
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: schedule };
    });
    // 更新课程表条目
    router.put('/admin/schedules/:id', async (ctx) => {
        const { id } = ctx.params;
        const { name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, isActive, startDate, endDate } = ctx.request.body;
        const authHeader = ctx.headers.authorization;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyToken)(token);
            isAdmin = payload?.role === 'admin';
        }
        if (!isAdmin) {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null };
            return;
        }
        if (isDailyTask === true && (points === undefined || points < 1)) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '当日任务需要设置积分值', data: null };
            return;
        }
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (dayOfWeek !== undefined)
            updateData.dayOfWeek = dayOfWeek;
        if (startTime !== undefined)
            updateData.startTime = startTime;
        if (endTime !== undefined)
            updateData.endTime = endTime;
        if (location !== undefined)
            updateData.location = location;
        if (type !== undefined)
            updateData.type = type;
        if (color !== undefined)
            updateData.color = color;
        if (isDailyTask !== undefined)
            updateData.isDailyTask = isDailyTask;
        if (points !== undefined)
            updateData.points = points;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (startDate !== undefined)
            updateData.startDate = startDate ? new Date(startDate + 'T00:00:00.000Z') : null;
        if (endDate !== undefined)
            updateData.endDate = endDate ? new Date(endDate + 'T23:59:59.999Z') : null;
        const schedule = await prisma_1.prisma.schedule.update({
            where: { id },
            data: updateData
        });
        ctx.body = { code: 0, message: 'ok', data: schedule };
    });
    // 删除课程表条目
    router.delete('/admin/schedules/:id', async (ctx) => {
        const { id } = ctx.params;
        const authHeader = ctx.headers.authorization;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyToken)(token);
            isAdmin = payload?.role === 'admin';
        }
        if (!isAdmin) {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null };
            return;
        }
        await prisma_1.prisma.schedule.delete({ where: { id } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
}
//# sourceMappingURL=schedule.js.map