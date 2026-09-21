"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.familyScope = void 0;
exports.childInScope = childInScope;
exports.v2Routes = v2Routes;
exports.blockMigratedChildLogin = blockMigratedChildLogin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
const auth_1 = require("../middleware/auth");
// ---------- familyScope：JWT → user → familyId → ctx.state.family ----------
const familyScope = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { code: 401, message: 'Unauthorized: No token provided', data: null };
        return;
    }
    const payload = (0, jwt_1.verifyToken)(authHeader.substring(7));
    if (!payload) {
        ctx.status = 401;
        ctx.body = { code: 401, message: 'Unauthorized: Invalid token', data: null };
        return;
    }
    ctx.state.user = payload;
    const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.familyId) {
        ctx.status = 403;
        ctx.body = { code: 403, message: '账号未绑定家庭', data: null };
        return;
    }
    // admin 可通过 ?familyId= 查任意家庭
    const qFamilyId = ctx.query.familyId;
    const familyId = user.role === 'admin' && qFamilyId ? qFamilyId : user.familyId;
    const family = await prisma_1.prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
        ctx.status = 403;
        ctx.body = { code: 403, message: '家庭不存在', data: null };
        return;
    }
    ctx.state.family = family;
    ctx.state.familyUser = user;
    await next();
};
exports.familyScope = familyScope;
// 校验 child 属于当前家庭；返回 child 或 null（已写响应）
async function childInScope(ctx, childId) {
    if (!childId) {
        ctx.status = 400;
        ctx.body = { code: 400, message: 'childId 必填', data: null };
        return null;
    }
    const family = ctx.state.family;
    const child = await prisma_1.prisma.child.findFirst({
        where: { id: childId, familyId: family.id },
    });
    if (!child) {
        ctx.status = 403;
        ctx.body = { code: 403, message: '孩子不存在或不属于当前家庭', data: null };
        return null;
    }
    return child;
}
function v2Routes(router) {
    // ---------- 注册（开放，不走 familyScope）----------
    router.post('/v2/auth/register', async (ctx) => {
        const { username, password, name, inviteCode } = ctx.request.body;
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '用户名和密码必填', data: null };
            return;
        }
        const exists = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (exists) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '用户名已存在', data: null };
            return;
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        let family;
        if (inviteCode && inviteCode.trim()) {
            family = await prisma_1.prisma.family.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
            if (!family) {
                ctx.status = 400;
                ctx.body = { code: 400, message: '邀请码无效', data: null };
                return;
            }
        }
        else {
            family = await prisma_1.prisma.family.create({
                data: { name: name ? `${name}家` : `${username}家`, inviteCode: genInviteCode() },
            });
        }
        const user = await prisma_1.prisma.user.create({
            data: {
                username,
                password: hashed,
                role: 'parent',
                name: name || username,
                familyId: family.id,
            },
        });
        ctx.status = 201;
        ctx.body = {
            code: 0,
            message: 'ok',
            data: {
                token: (0, jwt_1.generateToken)({ userId: user.id, username: user.username, role: user.role }),
                user: { id: user.id, username: user.username, role: user.role, name: user.name, familyId: family.id },
            },
        };
    });
    // ---------- 以下全部走 familyScope ----------
    // 当前家庭 + children 列表
    router.get('/v2/family', exports.familyScope, async (ctx) => {
        const family = ctx.state.family;
        const children = await prisma_1.prisma.child.findMany({
            where: { familyId: family.id },
            orderBy: { createdAt: 'asc' },
        });
        const members = await prisma_1.prisma.user.findMany({
            where: { familyId: family.id },
            select: { id: true, username: true, name: true, avatar: true, role: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });
        ctx.body = { code: 0, message: 'ok', data: { family, children, members } };
    });
    // 改家庭名（本家庭成员均可）
    router.patch('/v2/family', exports.familyScope, async (ctx) => {
        const { name } = ctx.request.body;
        const trimmed = (name || '').trim();
        if (!trimmed) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '家庭名不能为空', data: null };
            return;
        }
        const family = await prisma_1.prisma.family.update({ where: { id: ctx.state.family.id }, data: { name: trimmed } });
        ctx.body = { code: 0, message: 'ok', data: { family } };
    });
    // 加入家庭（无家庭用户，填邀请码）
    router.post('/v2/family/join', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const me = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!me) {
            ctx.status = 401;
            ctx.body = { code: 401, message: '用户不存在', data: null };
            return;
        }
        if (me.familyId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '你已在家庭中，请先退出当前家庭', data: null };
            return;
        }
        const { inviteCode } = ctx.request.body;
        if (!inviteCode?.trim()) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '请输入邀请码', data: null };
            return;
        }
        const fam = await prisma_1.prisma.family.findUnique({ where: { inviteCode: inviteCode.trim().toUpperCase() } });
        if (!fam) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '邀请码无效', data: null };
            return;
        }
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { familyId: fam.id } });
        ctx.body = { code: 0, message: 'ok', data: { familyId: fam.id, familyName: fam.name } };
    });
    // 退出家庭（家长均可；最后一个成员退出后家庭保留数据）
    router.post('/v2/family/leave', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const me = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!me?.familyId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '你不在任何家庭中', data: null };
            return;
        }
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { familyId: null } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    // 移除其他家庭成员
    router.post('/v2/family/kick', exports.familyScope, async (ctx) => {
        const me = ctx.state.user;
        const { userId } = ctx.request.body;
        if (!userId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '缺少 userId', data: null };
            return;
        }
        if (userId === me.userId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '不能移除自己，请用退出家庭', data: null };
            return;
        }
        const target = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!target || target.familyId !== ctx.state.family.id) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '该用户不在本家庭', data: null };
            return;
        }
        await prisma_1.prisma.user.update({ where: { id: userId }, data: { familyId: null } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    // 重新生成邀请码
    router.post('/v2/family/invite-code', exports.familyScope, async (ctx) => {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++)
            code += chars[Math.floor(Math.random() * chars.length)];
        try {
            const family = await prisma_1.prisma.family.update({ where: { id: ctx.state.family.id }, data: { inviteCode: code } });
            ctx.body = { code: 0, message: 'ok', data: { inviteCode: family.inviteCode } };
        }
        catch (e) {
            if (e?.code === 'P2002') {
                ctx.body = { code: 0, message: 'ok', data: { inviteCode: ctx.state.family.inviteCode } };
                return;
            }
            throw e;
        }
    });
    // ---------- children CRUD ----------
    router.get('/v2/children', exports.familyScope, async (ctx) => {
        const children = await prisma_1.prisma.child.findMany({
            where: { familyId: ctx.state.family.id },
            orderBy: { createdAt: 'asc' },
        });
        ctx.body = { code: 0, message: 'ok', data: children };
    });
    router.post('/v2/children', exports.familyScope, async (ctx) => {
        const { name, gender, age, avatar } = ctx.request.body;
        if (!name) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '孩子姓名必填', data: null };
            return;
        }
        const child = await prisma_1.prisma.child.create({
            data: { familyId: ctx.state.family.id, name, gender: gender || 'male', age: age ?? null, avatar },
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: child };
    });
    router.patch('/v2/children/:id', exports.familyScope, async (ctx) => {
        const child = await childInScope(ctx, ctx.params.id);
        if (!child)
            return;
        const { name, gender, age, avatar, isActive } = ctx.request.body;
        const updated = await prisma_1.prisma.child.update({
            where: { id: child.id },
            data: { ...(name !== undefined && { name }), ...(gender !== undefined && { gender }), ...(age !== undefined && { age }), ...(avatar !== undefined && { avatar }), ...(isActive !== undefined && { isActive }) },
        });
        ctx.body = { code: 0, message: 'ok', data: updated };
    });
    router.delete('/v2/children/:id', exports.familyScope, async (ctx) => {
        const child = await childInScope(ctx, ctx.params.id);
        if (!child)
            return;
        const inUse = (await prisma_1.prisma.task.count({ where: { childId: child.id } })) +
            (await prisma_1.prisma.schedule.count({ where: { childId: child.id } }));
        if (inUse > 0) {
            // 软删：有业务数据的孩子只停用
            await prisma_1.prisma.child.update({ where: { id: child.id }, data: { isActive: false } });
            ctx.body = { code: 0, message: '孩子有课程/任务数据，已停用（软删除）', data: { id: child.id, isActive: false } };
            return;
        }
        await prisma_1.prisma.child.delete({ where: { id: child.id } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    // ---------- tasks ----------
    router.get('/v2/tasks', exports.familyScope, async (ctx) => {
        const { childId, date, startDate, endDate } = ctx.query;
        const where = { child: { familyId: ctx.state.family.id } };
        if (childId) {
            const child = await childInScope(ctx, childId);
            if (!child)
                return;
            where.childId = child.id;
        }
        if (date) {
            const d = new Date(`${date}T00:00:00+08:00`);
            const next = new Date(d);
            next.setDate(next.getDate() + 1);
            where.startDate = { lte: next };
            where.endDate = { gte: d };
        }
        else if (startDate && endDate) {
            where.startDate = { lte: new Date(`${endDate}T23:59:59+08:00`) };
            where.endDate = { gte: new Date(`${startDate}T00:00:00+08:00`) };
        }
        const tasks = await prisma_1.prisma.task.findMany({ where, orderBy: { createdAt: 'desc' }, include: { child: { select: { id: true, name: true } } } });
        ctx.body = { code: 0, message: 'ok', data: tasks };
    });
    router.post('/v2/tasks', exports.familyScope, async (ctx) => {
        const { title, type, points, childId, startDate, endDate } = ctx.request.body;
        const child = await childInScope(ctx, childId);
        if (!child)
            return;
        if (!title || !startDate || !endDate) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'title/startDate/endDate 必填', data: null };
            return;
        }
        const adminUser = ctx.state.familyUser;
        const task = await prisma_1.prisma.task.create({
            data: {
                title, type: type || 'other', points: points ?? 5,
                childId: child.id, userId: adminUser.id,
                startDate: new Date(startDate), endDate: new Date(endDate),
            },
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: task };
    });
    router.patch('/v2/tasks/:id', exports.familyScope, async (ctx) => {
        const task = await prisma_1.prisma.task.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } });
        if (!task) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '任务不存在', data: null };
            return;
        }
        const { isCompleted, title, points } = ctx.request.body;
        const data = {};
        if (isCompleted !== undefined) {
            data.isCompleted = isCompleted;
            data.completedAt = isCompleted ? new Date() : null;
            // 积分联动：完成加分/取消扣分（与旧接口一致）
            if (isCompleted && !task.isCompleted) {
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.child.update({ where: { id: task.childId }, data: { points: { increment: task.points } } }),
                    prisma_1.prisma.pointRecord.create({ data: { childId: task.childId, userId: ctx.state.familyUser.id, taskId: task.id, taskTitle: task.title, points: task.points, reason: '完成任务' } }),
                ]);
            }
            else if (!isCompleted && task.isCompleted) {
                await prisma_1.prisma.$transaction([
                    prisma_1.prisma.child.update({ where: { id: task.childId }, data: { points: { decrement: task.points } } }),
                    prisma_1.prisma.pointRecord.create({ data: { childId: task.childId, userId: ctx.state.familyUser.id, taskId: task.id, taskTitle: task.title, points: -task.points, reason: '取消完成' } }),
                ]);
            }
        }
        if (title !== undefined)
            data.title = title;
        if (points !== undefined)
            data.points = points;
        const updated = await prisma_1.prisma.task.update({ where: { id: task.id }, data });
        ctx.body = { code: 0, message: 'ok', data: updated };
    });
    router.delete('/v2/tasks/:id', exports.familyScope, async (ctx) => {
        const task = await prisma_1.prisma.task.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } });
        if (!task) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '任务不存在', data: null };
            return;
        }
        await prisma_1.prisma.task.delete({ where: { id: task.id } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    // ---------- schedules ----------
    router.get('/v2/schedules', exports.familyScope, async (ctx) => {
        const { childId } = ctx.query;
        const where = { child: { familyId: ctx.state.family.id }, isActive: true };
        if (childId) {
            const child = await childInScope(ctx, childId);
            if (!child)
                return;
            where.childId = child.id;
        }
        const schedules = await prisma_1.prisma.schedule.findMany({ where, orderBy: { createdAt: 'asc' }, include: { child: { select: { id: true, name: true } } } });
        ctx.body = { code: 0, message: 'ok', data: schedules };
    });
    router.post('/v2/schedules', exports.familyScope, async (ctx) => {
        const { name, dayOfWeek, startTime, endTime, location, type, color, isDailyTask, points, childId, startDate, endDate } = ctx.request.body;
        const child = await childInScope(ctx, childId);
        if (!child)
            return;
        if (!name || !dayOfWeek || !startTime || !endTime) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'name/dayOfWeek/startTime/endTime 必填', data: null };
            return;
        }
        const adminUser = ctx.state.familyUser;
        const schedule = await prisma_1.prisma.schedule.create({
            data: {
                name, dayOfWeek, startTime, endTime,
                location, type: type || 'other', color, isDailyTask: !!isDailyTask, points: points ?? 1,
                childId: child.id, userId: adminUser.id,
                ...(startDate ? { startDate: new Date(startDate) } : {}),
                ...(endDate ? { endDate: new Date(endDate) } : {}),
            },
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: schedule };
    });
    router.patch('/v2/schedules/:id', exports.familyScope, async (ctx) => {
        const schedule = await prisma_1.prisma.schedule.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } });
        if (!schedule) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '课程不存在', data: null };
            return;
        }
        const b = ctx.request.body;
        const updated = await prisma_1.prisma.schedule.update({
            where: { id: schedule.id },
            data: {
                ...(b.name !== undefined && { name: b.name }),
                ...(b.dayOfWeek !== undefined && { dayOfWeek: b.dayOfWeek }),
                ...(b.startTime !== undefined && { startTime: b.startTime }),
                ...(b.endTime !== undefined && { endTime: b.endTime }),
                ...(b.location !== undefined && { location: b.location }),
                ...(b.type !== undefined && { type: b.type }),
                ...(b.color !== undefined && { color: b.color }),
                ...(b.isDailyTask !== undefined && { isDailyTask: b.isDailyTask }),
                ...(b.points !== undefined && { points: b.points }),
                ...(b.isActive !== undefined && { isActive: b.isActive }),
                ...(b.startDate !== undefined && { startDate: b.startDate ? new Date(b.startDate) : null }),
                ...(b.endDate !== undefined && { endDate: b.endDate ? new Date(b.endDate) : null }),
            },
        });
        ctx.body = { code: 0, message: 'ok', data: updated };
    });
    router.delete('/v2/schedules/:id', exports.familyScope, async (ctx) => {
        const schedule = await prisma_1.prisma.schedule.findFirst({ where: { id: ctx.params.id, child: { familyId: ctx.state.family.id } } });
        if (!schedule) {
            ctx.status = 404;
            ctx.body = { code: 404, message: '课程不存在', data: null };
            return;
        }
        await prisma_1.prisma.schedule.delete({ where: { id: schedule.id } });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
    // ---------- 积分 ----------
    router.get('/v2/children/:id/points', exports.familyScope, async (ctx) => {
        const child = await childInScope(ctx, ctx.params.id);
        if (!child)
            return;
        const records = await prisma_1.prisma.pointRecord.findMany({
            where: { childId: child.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        ctx.body = { code: 0, message: 'ok', data: { points: child.points, records } };
    });
    router.post('/v2/children/:id/points', exports.familyScope, async (ctx) => {
        const child = await childInScope(ctx, ctx.params.id);
        if (!child)
            return;
        const { points, reason } = ctx.request.body;
        if (!points || !reason) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'points/reason 必填', data: null };
            return;
        }
        const [updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.child.update({ where: { id: child.id }, data: { points: { increment: points } } }),
            prisma_1.prisma.pointRecord.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, taskTitle: reason, points, reason: points > 0 ? '完成任务' : '取消完成' } }),
        ]);
        ctx.body = { code: 0, message: 'ok', data: { points: updated.points } };
    });
    router.get('/v2/point-records', exports.familyScope, async (ctx) => {
        const { childId } = ctx.query;
        const where = { child: { familyId: ctx.state.family.id } };
        if (childId) {
            const child = await childInScope(ctx, childId);
            if (!child)
                return;
            where.childId = child.id;
        }
        const records = await prisma_1.prisma.pointRecord.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, include: { child: { select: { id: true, name: true } } } });
        ctx.body = { code: 0, message: 'ok', data: records };
    });
    // ---------- 抽卡 ----------
    router.get('/v2/lottery/info', exports.familyScope, async (ctx) => {
        const { childId } = ctx.query;
        const child = await childInScope(ctx, childId);
        if (!child)
            return;
        const cards = await prisma_1.prisma.studentCard.findMany({
            where: { childId: child.id },
            include: { card: true },
            orderBy: { drawnAt: 'desc' },
        });
        ctx.body = { code: 0, message: 'ok', data: { points: child.points, cards } };
    });
    router.post('/v2/lottery/draw', exports.familyScope, async (ctx) => {
        const { childId, pointsCost } = ctx.request.body;
        const child = await childInScope(ctx, childId);
        if (!child)
            return;
        const cost = pointsCost ?? 10;
        if (child.points < cost) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '积分不足', data: null };
            return;
        }
        // ponytail: 沿用旧接口的简单均匀抽取；要稀有度权重再说
        const cards = await prisma_1.prisma.card.findMany({ where: { isActive: true } });
        if (cards.length === 0) {
            ctx.status = 400;
            ctx.body = { code: 400, message: '奖池为空', data: null };
            return;
        }
        const picked = cards[Math.floor(Math.random() * cards.length)];
        const [, studentCard] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.child.update({ where: { id: child.id }, data: { points: { decrement: cost } } }),
            prisma_1.prisma.studentCard.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, cardId: picked.id } }),
            prisma_1.prisma.pointRecord.create({ data: { childId: child.id, userId: ctx.state.familyUser.id, taskTitle: `抽卡：${picked.name}`, points: -cost, reason: '抽卡消耗' } }),
        ]);
        ctx.body = { code: 0, message: 'ok', data: { card: picked, studentCard, pointsLeft: child.points - cost } };
    });
}
// 旧孩子账号登录拦截：挂到旧 /auth/login 前
async function blockMigratedChildLogin(ctx, next) {
    const { username, password } = ctx.request.body;
    if (username && password) {
        const user = await prisma_1.prisma.user.findUnique({ where: { username } });
        if (user && (user.role === 'user')) {
            ctx.status = 403;
            ctx.body = { code: 403, message: '孩子账号已并入家庭档案，请用家长账号登录', data: null };
            return;
        }
    }
    await next();
}
function genInviteCode() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let c = '';
    for (let i = 0; i < 6; i++)
        c += chars[Math.floor(Math.random() * chars.length)];
    return c;
}
//# sourceMappingURL=v2.js.map