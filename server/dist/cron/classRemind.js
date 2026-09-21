"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanAndRemind = scanAndRemind;
exports.startClassRemindCron = startClassRemindCron;
const cron = __importStar(require("node-cron"));
const prisma_1 = require("../utils/prisma");
const wxNotice_1 = require("../services/wxNotice");
// 今天某家庭的家长已发过？lastNotifyDate = today
function alreadyNotified(user, today) {
    return user.lastNotifyDate === today;
}
async function scanAndRemind() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const dow = String(now.getDay());
    // 今天所有有效课程
    const schedules = await prisma_1.prisma.schedule.findMany({
        where: {
            isActive: true,
            isDailyTask: false,
            dayOfWeek: { contains: dow },
            AND: [
                { OR: [{ startDate: null }, { startDate: { lte: now } }] },
                { OR: [{ endDate: null }, { endDate: { gte: now } }] }
            ]
        },
        include: { child: { include: { family: { include: { users: true } } } } }
    });
    // 按家庭分组，算每家第一条课的提醒时间
    const byFamily = new Map();
    for (const s of schedules) {
        if (!s.child?.family)
            continue;
        const fid = s.child.familyId;
        if (!byFamily.has(fid))
            byFamily.set(fid, []);
        byFamily.get(fid).push(s);
    }
    for (const [fid, famSchedules] of byFamily) {
        // 解析 startTime → 排序找第一条
        const sorted = famSchedules
            .map(s => {
            const [h, m] = (s.startTime || '00:00').split(':').map(Number);
            return { s, startMin: h * 60 + m };
        })
            .filter(x => x.startMin + 30 > nowMin) // 只看还没下课太久的
            .sort((a, b) => a.startMin - b.startMin);
        if (sorted.length === 0)
            continue;
        const first = sorted[0];
        const family = first.s.child.family;
        const remindMin = family.users[0]?.remindMinutes ?? 30;
        const remindAt = first.startMin - remindMin;
        if (nowMin !== remindAt)
            continue; // 只在提醒时刻那一分钟发
        const lessons = sorted
            .map(x => `${x.s.startTime} ${x.s.name}${x.s.child?.name ? '(' + x.s.child.name + ')' : ''}`)
            .join('，');
        const firstLesson = `${first.s.startTime} ${first.s.name}${first.s.child?.name ? ' - ' + first.s.child.name : ''}`;
        for (const u of family.users) {
            if (!u.notifyEnabled || alreadyNotified(u, today))
                continue;
            const ok = await (0, wxNotice_1.sendClassRemind)(u.id, firstLesson, lessons, remindMin);
            if (ok) {
                await prisma_1.prisma.user.update({ where: { id: u.id }, data: { lastNotifyDate: today } });
                console.log(`[ClassRemind] sent to ${u.username}: ${firstLesson}`);
            }
        }
    }
}
function startClassRemindCron() {
    cron.schedule('* * * * *', scanAndRemind, { timezone: 'Asia/Shanghai' });
    console.log('[Cron] Class remind cron scheduled every minute');
}
//# sourceMappingURL=classRemind.js.map