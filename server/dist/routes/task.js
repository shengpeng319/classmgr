"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskRoutes = taskRoutes;
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const dailyTask_1 = require("../cron/dailyTask");
function taskRoutes(router) {
    router.post('/admin/tasks/generate-daily', async (ctx) => {
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
        try {
            await (0, dailyTask_1.generateDailyTasks)();
            ctx.body = { code: 0, message: 'Daily tasks generated successfully', data: null };
        }
        catch (e) {
            ctx.status = 500;
            ctx.body = { code: 500, message: e.message, data: null };
        }
    });
    router.get('/tasks', async (ctx) => {
        const { userId, startDate, endDate } = ctx.query;
        const authHeader = ctx.headers.authorization;
        let tokenPayload = null;
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            tokenPayload = (0, jwt_1.verifyToken)(token);
            isAdmin = tokenPayload?.role === 'admin';
        }
        const where = {};
        if (isAdmin && userId) {
            where.userId = userId;
        }
        else if (isAdmin) {
            // Admin without userId gets all tasks - no userId filter
        }
        else if (tokenPayload) {
            // Regular user gets only their own tasks
            where.userId = tokenPayload.userId;
        }
        else {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'userId is required', data: null };
            return;
        }
        if (startDate && endDate) {
            const qStart = new Date(startDate + 'T00:00:00.000Z');
            const qEnd = new Date(endDate + 'T23:59:59.999Z');
            where.AND = [
                { endDate: { gte: qStart } },
                { startDate: { lte: qEnd } }
            ];
        }
        else if (startDate) {
            where.endDate = { gte: new Date(startDate + 'T00:00:00.000Z') };
        }
        else if (endDate) {
            where.startDate = { lte: new Date(endDate + 'T23:59:59.999Z') };
        }
        const tasks = await prisma_1.prisma.task.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
        });
        ctx.body = { code: 0, message: 'ok', data: tasks };
    });
    router.post('/tasks/init', async (ctx) => {
        const { userId, tasks } = ctx.request.body;
        if (!userId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'userId is required', data: null };
            return;
        }
        const existingTasks = await prisma_1.prisma.task.count({
            where: { userId }
        });
        if (existingTasks > 0) {
            ctx.body = { code: 0, message: 'Tasks already initialized', data: null };
            return;
        }
        const createdTasks = await prisma_1.prisma.task.createMany({
            data: tasks.map(t => ({
                title: t.title,
                type: t.type,
                userId,
                startDate: new Date(t.startDate + 'T00:00:00.000Z'),
                endDate: new Date(t.endDate + 'T23:59:59.999Z'),
                isCompleted: false
            }))
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: createdTasks };
    });
    // Admin routes
    router.get('/admin/tasks', async (ctx) => {
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
        const where = {};
        if (userId) {
            where.userId = userId;
        }
        if (startDate && endDate) {
            const qStart = new Date(startDate + 'T00:00:00.000Z');
            const qEnd = new Date(endDate + 'T23:59:59.999Z');
            where.OR = [
                { startDate: { gte: qStart, lte: qEnd } },
                { endDate: { gte: qStart, lte: qEnd } },
                { AND: [{ startDate: { lte: qStart } }, { endDate: { gte: qEnd } }] }
            ];
        }
        else if (startDate) {
            where.startDate = { gte: new Date(startDate + 'T00:00:00.000Z') };
        }
        else if (endDate) {
            where.endDate = { lte: new Date(endDate + 'T23:59:59.999Z') };
        }
        const tasks = await prisma_1.prisma.task.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
        });
        ctx.body = { code: 0, message: 'ok', data: tasks };
    });
    router.post('/admin/tasks', async (ctx) => {
        const { userId, title, type, points, startDate, endDate } = ctx.request.body;
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
        if (!userId || !title || !type || !startDate || !endDate) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Missing required fields', data: null };
            return;
        }
        const task = await prisma_1.prisma.task.create({
            data: {
                userId,
                title,
                type,
                points: Number(points) || 5,
                startDate: new Date(startDate + 'T00:00:00.000Z'),
                endDate: new Date(endDate + 'T23:59:59.999Z'),
                isCompleted: false
            },
            include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: task };
    });
    router.put('/admin/tasks/:id', async (ctx) => {
        const { id } = ctx.params;
        const { title, type, points, startDate, endDate, isCompleted } = ctx.request.body;
        const authHeader = ctx.headers.authorization;
        let isAdmin = false;
        let currentUserId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = (0, jwt_1.verifyToken)(token);
            isAdmin = payload?.role === 'admin';
            currentUserId = payload?.userId || null;
        }
        const oldTask = await prisma_1.prisma.task.findUnique({ where: { id } });
        if (!oldTask) {
            ctx.status = 404;
            ctx.body = { code: 404, message: 'Task not found', data: null };
            return;
        }
        if (!isAdmin) {
            if (!currentUserId || oldTask.userId !== currentUserId) {
                ctx.status = 403;
                ctx.body = { code: 403, message: 'Forbidden', data: null };
                return;
            }
            if (title || type || points !== undefined || startDate || endDate) {
                ctx.status = 403;
                ctx.body = { code: 403, message: 'Forbidden: Only admin can edit task details', data: null };
                return;
            }
        }
        const updateData = {};
        if (title !== undefined)
            updateData.title = title;
        if (type !== undefined)
            updateData.type = type;
        if (points !== undefined)
            updateData.points = Number(points);
        if (startDate !== undefined)
            updateData.startDate = new Date(startDate + 'T00:00:00.000Z');
        if (endDate !== undefined)
            updateData.endDate = new Date(endDate + 'T23:59:59.999Z');
        if (isCompleted !== undefined) {
            updateData.isCompleted = isCompleted;
            updateData.completedAt = isCompleted ? new Date() : null;
        }
        if (isCompleted !== undefined && isCompleted !== oldTask.isCompleted) {
            const pointDelta = isCompleted ? oldTask.points : -oldTask.points;
            const transactionOps = [
                prisma_1.prisma.task.update({
                    where: { id },
                    data: updateData,
                    include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
                }),
                prisma_1.prisma.user.update({
                    where: { id: oldTask.userId },
                    data: { points: { increment: pointDelta } }
                }),
                prisma_1.prisma.pointRecord.create({
                    data: {
                        userId: oldTask.userId,
                        taskId: oldTask.id,
                        taskTitle: oldTask.title,
                        points: pointDelta,
                        reason: isCompleted ? '完成任务' : '撤销完成'
                    }
                })
            ];
            const [task] = await prisma_1.prisma.$transaction(transactionOps);
            ctx.body = { code: 0, message: 'ok', data: task };
        }
        else {
            const task = await prisma_1.prisma.task.update({
                where: { id },
                data: updateData,
                include: { user: { select: { id: true, username: true, name: true, avatar: true } } }
            });
            ctx.body = { code: 0, message: 'ok', data: task };
        }
    });
    router.delete('/admin/tasks/:id', async (ctx) => {
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
        await prisma_1.prisma.task.delete({ where: { id } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    router.get('/point-records', async (ctx) => {
        const authHeader = ctx.headers.authorization;
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
        const records = await prisma_1.prisma.pointRecord.findMany({
            where: { userId: tokenPayload.userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        ctx.body = { code: 0, message: 'ok', data: records };
    });
    router.get('/admin/point-records', async (ctx) => {
        const authHeader = ctx.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Unauthorized', data: null };
            return;
        }
        const token = authHeader.substring(7);
        const tokenPayload = (0, jwt_1.verifyToken)(token);
        if (!tokenPayload || tokenPayload.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden', data: null };
            return;
        }
        const { userId } = ctx.query;
        const where = {};
        if (userId) {
            where.userId = userId;
        }
        const records = await prisma_1.prisma.pointRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        ctx.body = { code: 0, message: 'ok', data: records };
    });
    router.get('/admin/users/:id/points', async (ctx) => {
        const authHeader = ctx.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Unauthorized', data: null };
            return;
        }
        const token = authHeader.substring(7);
        const tokenPayload = (0, jwt_1.verifyToken)(token);
        if (!tokenPayload || tokenPayload.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden', data: null };
            return;
        }
        const { id } = ctx.params;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, avatar: true, points: true }
        });
        if (!user) {
            ctx.status = 404;
            ctx.body = { code: 404, message: 'User not found', data: null };
            return;
        }
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    router.post('/admin/points/adjust', async (ctx) => {
        const authHeader = ctx.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Unauthorized', data: null };
            return;
        }
        const token = authHeader.substring(7);
        const tokenPayload = (0, jwt_1.verifyToken)(token);
        if (!tokenPayload || tokenPayload.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden', data: null };
            return;
        }
        const { userId, points, reason } = ctx.request.body;
        if (!userId || points === undefined) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Missing required fields', data: null };
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            ctx.status = 404;
            ctx.body = { code: 404, message: 'User not found', data: null };
            return;
        }
        const newPoints = user.points + points;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.user.update({
                where: { id: userId },
                data: { points: newPoints }
            }),
            prisma_1.prisma.pointRecord.create({
                data: {
                    userId,
                    taskTitle: '管理员调整',
                    points,
                    reason: reason || '',
                    taskId: null
                }
            })
        ]);
        ctx.body = { code: 0, message: 'ok', data: { points: newPoints } };
    });
}
//# sourceMappingURL=task.js.map