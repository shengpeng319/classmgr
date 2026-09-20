"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAITool = getAITool;
exports.aiToolDefs = aiToolDefs;
exports.createPendingConfirm = createPendingConfirm;
exports.takePendingConfirm = takePendingConfirm;
/**
 * AI 工具注册表（L2）—— 白名单注册制
 *
 * 每个工具 = { name, description, parameters(JSON Schema), needsConfirm, summarize, execute }
 * 安全约定：
 *  - execute 的 userId 一律取自登录态（AIContext），绝不信任模型传参里的用户身份
 *  - needsConfirm=true 的工具不直接执行：先存入内存 pending map（5 分钟过期），
 *    用户点击确认后由 POST /ai/confirm 触发真正的 execute
 *  - 工具内部只是「调用」现有 prisma 查询模式，不改各路由的业务逻辑
 */
const crypto_1 = require("crypto");
const prisma_1 = require("../utils/prisma");
// ---- 公共辅助 ----
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const SCHEDULE_TYPES = ['school', 'tutoring', 'homework', 'sports', 'art', 'other'];
function toDateStart(dateStr) {
    return new Date(`${dateStr}T00:00:00.000Z`);
}
function toDateEnd(dateStr) {
    return new Date(`${dateStr}T23:59:59.999Z`);
}
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}
function formatDayOfWeek(dayOfWeek) {
    return String(dayOfWeek)
        .split(',')
        .map((d) => {
        const n = parseInt(d.trim(), 10);
        return WEEKDAY_NAMES[n] ?? d.trim();
    })
        .join('、');
}
function normalizeScheduleList(args) {
    const raw = args?.schedules;
    if (Array.isArray(raw))
        return raw;
    if (raw && typeof raw === 'object')
        return [raw];
    if (args && !args.schedules && args.name)
        return [args]; // 模型偶尔直接传单个对象
    return [];
}
// ---- 工具实现 ----
const listSchedules = {
    name: 'list_schedules',
    description: '查询当前用户的所有长期课程表安排（含课程名、星期、时间、地点、类型、积分）',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    needsConfirm: false,
    summarize: () => '查询课程表',
    execute: async (ctx) => {
        const now = new Date();
        const schedules = await prisma_1.prisma.schedule.findMany({
            where: {
                userId: ctx.userId,
                isActive: true,
                AND: [
                    { OR: [{ startDate: null }, { startDate: { lte: now } }] },
                    { OR: [{ endDate: null }, { endDate: { gte: now } }] }
                ]
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
        });
        return {
            count: schedules.length,
            schedules: schedules.map((s) => ({
                id: s.id,
                name: s.name,
                dayOfWeek: s.dayOfWeek,
                dayOfWeekText: formatDayOfWeek(s.dayOfWeek),
                startTime: s.startTime,
                endTime: s.endTime,
                location: s.location,
                type: s.type,
                isDailyTask: s.isDailyTask,
                points: s.points,
                startDate: s.startDate,
                endDate: s.endDate
            }))
        };
    }
};
const createSchedules = {
    name: 'create_schedules',
    description: '批量新增课程表条目（课表图片识别结果的落库也用它）。每条课程包含：name(课程名)、dayOfWeek(字符串，逗号分隔，0=周日、1=周一…6=周六，如"3")、startTime/endTime(24小时制 HH:mm，如下午3点=15:00)、type(school|tutoring|homework|sports|art|other，游泳/篮球等归 sports)；可选 location、color、isDailyTask(是否每日任务)、points、startDate/endDate(YYYY-MM-DD 有效期)',
    parameters: {
        type: 'object',
        properties: {
            schedules: {
                type: 'array',
                description: '要新增的课程列表',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: '课程名称，如 游泳课' },
                        dayOfWeek: { type: 'string', description: '星期几，逗号分隔，0=周日' },
                        startTime: { type: 'string', description: '开始时间 HH:mm' },
                        endTime: { type: 'string', description: '结束时间 HH:mm' },
                        location: { type: 'string' },
                        type: { type: 'string', enum: SCHEDULE_TYPES },
                        color: { type: 'string' },
                        isDailyTask: { type: 'boolean' },
                        points: { type: 'number' },
                        startDate: { type: 'string', description: 'YYYY-MM-DD' },
                        endDate: { type: 'string', description: 'YYYY-MM-DD' }
                    },
                    required: ['name', 'dayOfWeek', 'startTime', 'endTime', 'type']
                }
            }
        },
        required: ['schedules']
    },
    needsConfirm: true,
    summarize: (args) => {
        const list = normalizeScheduleList(args);
        if (!list.length)
            return '新增课程';
        return `新增课程：${list
            .map((s) => `${s.name} ${formatDayOfWeek(String(s.dayOfWeek ?? ''))} ${s.startTime || ''}-${s.endTime || ''}`)
            .join('；')}`;
    },
    execute: async (ctx, args) => {
        const list = normalizeScheduleList(args);
        if (!list.length)
            throw new Error('没有可创建的课程');
        const data = list.map((s) => ({
            userId: ctx.userId,
            name: String(s.name || '').trim(),
            dayOfWeek: String(s.dayOfWeek ?? '').trim(),
            startTime: String(s.startTime || '').trim(),
            endTime: String(s.endTime || '').trim(),
            location: s.location ? String(s.location) : undefined,
            type: SCHEDULE_TYPES.includes(s.type) ? s.type : 'other',
            color: s.color || '#87CEEB',
            isDailyTask: !!s.isDailyTask,
            points: Number(s.points) > 0 ? Number(s.points) : 1,
            startDate: s.startDate ? toDateStart(String(s.startDate)) : null,
            endDate: s.endDate ? toDateEnd(String(s.endDate)) : null
        }));
        for (const d of data) {
            if (!d.name || !d.dayOfWeek || !d.startTime || !d.endTime) {
                throw new Error('课程缺少必填字段（name/dayOfWeek/startTime/endTime）');
            }
        }
        const result = await prisma_1.prisma.schedule.createMany({ data });
        return {
            success: true,
            createdCount: result.count,
            schedules: data.map((d) => `${d.name} ${formatDayOfWeek(d.dayOfWeek)} ${d.startTime}-${d.endTime}`)
        };
    }
};
const updateSchedule = {
    name: 'update_schedule',
    description: '修改当前用户的一条课程表（先用 list_schedules 拿到 id）。可修改字段：name、dayOfWeek、startTime、endTime、location、type、color、isDailyTask、points、startDate/endDate(YYYY-MM-DD 或 null 表示永久)',
    parameters: {
        type: 'object',
        properties: {
            id: { type: 'string', description: '课程表条目 id' },
            name: { type: 'string' },
            dayOfWeek: { type: 'string' },
            startTime: { type: 'string' },
            endTime: { type: 'string' },
            location: { type: 'string' },
            type: { type: 'string', enum: SCHEDULE_TYPES },
            color: { type: 'string' },
            isDailyTask: { type: 'boolean' },
            points: { type: 'number' },
            startDate: { type: ['string', 'null'], description: 'YYYY-MM-DD 或 null' },
            endDate: { type: ['string', 'null'], description: 'YYYY-MM-DD 或 null' }
        },
        required: ['id']
    },
    needsConfirm: true,
    summarize: (args) => {
        const changes = Object.keys(args || {})
            .filter((k) => k !== 'id')
            .map((k) => {
            let v = args[k];
            if (k === 'dayOfWeek' && typeof v === 'string')
                v = formatDayOfWeek(v);
            return `${k} → ${v}`;
        });
        return `修改课程（id=${args?.id}）：${changes.join('，') || '无变更'}`;
    },
    execute: async (ctx, args) => {
        const id = String(args?.id || '');
        if (!id)
            throw new Error('缺少课程 id');
        const existing = await prisma_1.prisma.schedule.findUnique({ where: { id } });
        if (!existing || existing.userId !== ctx.userId) {
            throw new Error('课程不存在或无权操作');
        }
        const updateData = {};
        if (args.name !== undefined)
            updateData.name = String(args.name);
        if (args.dayOfWeek !== undefined)
            updateData.dayOfWeek = String(args.dayOfWeek);
        if (args.startTime !== undefined)
            updateData.startTime = String(args.startTime);
        if (args.endTime !== undefined)
            updateData.endTime = String(args.endTime);
        if (args.location !== undefined)
            updateData.location = args.location;
        if (args.type !== undefined)
            updateData.type = SCHEDULE_TYPES.includes(args.type) ? args.type : existing.type;
        if (args.color !== undefined)
            updateData.color = args.color;
        if (args.isDailyTask !== undefined)
            updateData.isDailyTask = !!args.isDailyTask;
        if (args.points !== undefined)
            updateData.points = Number(args.points) > 0 ? Number(args.points) : existing.points;
        if (args.startDate !== undefined) {
            updateData.startDate = args.startDate ? toDateStart(String(args.startDate)) : null;
        }
        if (args.endDate !== undefined) {
            updateData.endDate = args.endDate ? toDateEnd(String(args.endDate)) : null;
        }
        const updated = await prisma_1.prisma.schedule.update({ where: { id }, data: updateData });
        return {
            success: true,
            schedule: {
                id: updated.id,
                name: updated.name,
                dayOfWeekText: formatDayOfWeek(updated.dayOfWeek),
                startTime: updated.startTime,
                endTime: updated.endTime
            }
        };
    }
};
const deleteSchedule = {
    name: 'delete_schedule',
    description: '删除当前用户的一条课程表（先用 list_schedules 拿到 id，删除前向用户复述课程名和时间）',
    parameters: {
        type: 'object',
        properties: {
            id: { type: 'string', description: '课程表条目 id' }
        },
        required: ['id']
    },
    needsConfirm: true,
    summarize: (args) => `删除课程（id=${args?.id}）`,
    execute: async (ctx, args) => {
        const id = String(args?.id || '');
        if (!id)
            throw new Error('缺少课程 id');
        const existing = await prisma_1.prisma.schedule.findUnique({ where: { id } });
        if (!existing || existing.userId !== ctx.userId) {
            throw new Error('课程不存在或无权操作');
        }
        await prisma_1.prisma.schedule.delete({ where: { id } });
        return {
            success: true,
            deleted: `${existing.name} ${formatDayOfWeek(existing.dayOfWeek)} ${existing.startTime}-${existing.endTime}`
        };
    }
};
const listTasks = {
    name: 'list_tasks',
    description: '查询当前用户某天的任务列表（默认今天），返回标题、类型、积分、完成状态',
    parameters: {
        type: 'object',
        properties: {
            date: { type: 'string', description: 'YYYY-MM-DD，缺省为今天' }
        }
    },
    needsConfirm: false,
    summarize: (args) => `查询任务（${args?.date || '今天'}）`,
    execute: async (ctx, args) => {
        const date = typeof args?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date) ? args.date : todayStr();
        const tasks = await prisma_1.prisma.task.findMany({
            where: {
                userId: ctx.userId,
                AND: [{ endDate: { gte: toDateStart(date) } }, { startDate: { lte: toDateEnd(date) } }]
            },
            orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }]
        });
        return {
            date,
            count: tasks.length,
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                type: t.type,
                points: t.points,
                isCompleted: t.isCompleted
            }))
        };
    }
};
const completeTask = {
    name: 'complete_task',
    description: '完成（或撤销完成）当前用户的一条任务，会同步发放/扣回任务积分并写入积分记录。isCompleted 缺省为 true（标记完成）',
    parameters: {
        type: 'object',
        properties: {
            taskId: { type: 'string', description: '任务 id（可用 list_tasks 查询）' },
            isCompleted: { type: 'boolean', description: 'true=完成，false=撤销完成' }
        },
        required: ['taskId']
    },
    needsConfirm: true,
    summarize: (args) => args?.isCompleted === false
        ? `撤销完成任务（taskId=${args?.taskId}）`
        : `完成任务（taskId=${args?.taskId}）`,
    execute: async (ctx, args) => {
        const taskId = String(args?.taskId || '');
        const target = args?.isCompleted !== false;
        if (!taskId)
            throw new Error('缺少任务 id');
        const task = await prisma_1.prisma.task.findUnique({ where: { id: taskId } });
        if (!task || task.userId !== ctx.userId) {
            throw new Error('任务不存在或无权操作');
        }
        if (task.isCompleted === target) {
            return { success: true, noOp: true, message: `任务「${task.title}」已处于${target ? '完成' : '未完成'}状态` };
        }
        const pointDelta = target ? task.points : -task.points;
        const [, user] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.task.update({
                where: { id: taskId },
                data: { isCompleted: target, completedAt: target ? new Date() : null }
            }),
            prisma_1.prisma.user.update({
                where: { id: ctx.userId },
                data: { points: { increment: pointDelta } }
            }),
            prisma_1.prisma.pointRecord.create({
                data: {
                    userId: ctx.userId,
                    taskId: task.id,
                    taskTitle: task.title,
                    points: pointDelta,
                    reason: target ? '完成任务' : '撤销完成'
                }
            })
        ]);
        return {
            success: true,
            taskTitle: task.title,
            isCompleted: target,
            pointsDelta: pointDelta,
            remainingPoints: user.points
        };
    }
};
const listPointRecords = {
    name: 'list_point_records',
    description: '查询当前用户最近的积分变动记录（含任务完成、管理员调整）',
    parameters: { type: 'object', properties: {} },
    needsConfirm: false,
    summarize: () => '查询积分记录',
    execute: async (ctx) => {
        const records = await prisma_1.prisma.pointRecord.findMany({
            where: { userId: ctx.userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        return {
            count: records.length,
            records: records.map((r) => ({
                taskTitle: r.taskTitle,
                points: r.points,
                reason: r.reason,
                createdAt: r.createdAt
            }))
        };
    }
};
const getPoints = {
    name: 'get_points',
    description: '查询当前用户的当前积分余额',
    parameters: { type: 'object', properties: {} },
    needsConfirm: false,
    summarize: () => '查询积分',
    execute: async (ctx) => {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: ctx.userId },
            select: { points: true }
        });
        return { points: user?.points ?? 0 };
    }
};
const addPoints = {
    name: 'add_points',
    description: '（仅管理员）给指定用户加减积分，points 为正数加分、负数减分，需说明原因。普通用户调用会被拒绝',
    parameters: {
        type: 'object',
        properties: {
            userId: { type: 'string', description: '目标用户 id' },
            points: { type: 'number', description: '积分变化，正数加分，负数减分' },
            reason: { type: 'string', description: '调整原因' }
        },
        required: ['userId', 'points']
    },
    needsConfirm: true,
    summarize: (args) => `调整积分：用户 ${args?.userId} ${args?.points > 0 ? '+' : ''}${args?.points}（${args?.reason || '无原因'}）`,
    execute: async (ctx, args) => {
        if (ctx.role !== 'admin') {
            throw new Error('仅管理员可以调整积分');
        }
        const targetUserId = String(args?.userId || '');
        const delta = Number(args?.points);
        if (!targetUserId)
            throw new Error('缺少目标用户 id');
        if (!Number.isFinite(delta) || delta === 0)
            throw new Error('积分变化必须是非零数字');
        const target = await prisma_1.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!target)
            throw new Error('目标用户不存在');
        const [, updated] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.pointRecord.create({
                data: {
                    userId: targetUserId,
                    taskId: null,
                    taskTitle: '管理员调整',
                    points: delta,
                    reason: args?.reason ? String(args.reason) : 'AI 助手调整'
                }
            }),
            prisma_1.prisma.user.update({
                where: { id: targetUserId },
                data: { points: target.points + delta }
            })
        ]);
        return {
            success: true,
            targetUser: target.name || target.username,
            adjusted: delta,
            points: updated.points
        };
    }
};
const listCards = {
    name: 'list_cards',
    description: '查询抽卡卡池中的所有卡牌（名称、稀有度、所需积分、库存）',
    parameters: { type: 'object', properties: {} },
    needsConfirm: false,
    summarize: () => '查询卡牌',
    execute: async () => {
        const cards = await prisma_1.prisma.card.findMany({
            where: { isActive: true },
            orderBy: [{ rarity: 'asc' }, { name: 'asc' }]
        });
        return {
            count: cards.length,
            cards: cards.map((c) => ({
                name: c.name,
                rarity: c.rarity,
                pointsCost: c.pointsCost,
                stock: c.stock
            }))
        };
    }
};
// ---- 注册表 ----
const allTools = [
    listSchedules,
    createSchedules,
    updateSchedule,
    deleteSchedule,
    listTasks,
    completeTask,
    listPointRecords,
    getPoints,
    addPoints,
    listCards
];
function getAITool(name) {
    return allTools.find((t) => t.name === name);
}
/** 导出给 LLM 的工具定义；管理员工具（add_points）只对 admin 暴露 */
function aiToolDefs(role) {
    return allTools
        .filter((t) => t.name !== 'add_points' || role === 'admin')
        .map((t) => ({
        type: 'function',
        function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters
        }
    }));
}
const pendingConfirms = new Map();
const CONFIRM_TTL_MS = 5 * 60 * 1000;
function cleanupExpired() {
    const now = Date.now();
    for (const [key, value] of pendingConfirms) {
        if (value.expiresAt < now)
            pendingConfirms.delete(key);
    }
}
function safeSummarize(tool, args) {
    try {
        return tool.summarize(args);
    }
    catch {
        return `${tool.name} ${JSON.stringify(args || {}).slice(0, 200)}`;
    }
}
function createPendingConfirm(userId, toolName, args) {
    cleanupExpired();
    const tool = getAITool(toolName);
    if (!tool)
        throw new Error(`未知工具: ${toolName}`);
    const confirmId = (0, crypto_1.randomUUID)();
    const summary = safeSummarize(tool, args);
    pendingConfirms.set(confirmId, {
        id: confirmId,
        userId,
        toolName,
        args,
        summary,
        expiresAt: Date.now() + CONFIRM_TTL_MS
    });
    return { confirmId, summary };
}
/** 取出（一次性）待确认操作；不存在 / 过期 / 非本人均返回 null */
function takePendingConfirm(confirmId, userId) {
    cleanupExpired();
    const pending = pendingConfirms.get(confirmId);
    if (!pending)
        return null;
    pendingConfirms.delete(confirmId);
    if (pending.userId !== userId || pending.expiresAt < Date.now())
        return null;
    return pending;
}
//# sourceMappingURL=aiTools.js.map