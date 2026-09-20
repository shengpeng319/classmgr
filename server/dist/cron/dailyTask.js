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
exports.startDailyTaskCron = startDailyTaskCron;
exports.generateDailyTasks = generateDailyTasks;
const cron = __importStar(require("node-cron"));
const prisma_1 = require("../utils/prisma");
function startDailyTaskCron() {
    cron.schedule('15 0 * * *', async () => {
        console.log('[Cron] Starting daily task generation...');
        await generateDailyTasks();
    }, {
        timezone: 'Asia/Shanghai'
    });
    console.log('[Cron] Daily task cron scheduled at 00:15 daily');
}
async function generateDailyTasks() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999); // 当天最后一秒
    const dayOfWeek = today.getDay();
    console.log(`[Cron] Generating tasks for ${today.toISOString().split('T')[0]}, dayOfWeek: ${dayOfWeek}`);
    const dailySchedules = await prisma_1.prisma.schedule.findMany({
        where: {
            isDailyTask: true,
            isActive: true,
            AND: [
                {
                    OR: [
                        { startDate: null },
                        { startDate: { lte: today } }
                    ]
                },
                {
                    OR: [
                        { endDate: null },
                        { endDate: { gte: today } }
                    ]
                }
            ]
        }
    });
    console.log(`[Cron] Found ${dailySchedules.length} daily schedules`);
    const tasksToCreate = [];
    for (const schedule of dailySchedules) {
        const scheduleDays = schedule.dayOfWeek.split(',').map(d => Number(d.trim()));
        if (!scheduleDays.includes(dayOfWeek)) {
            console.log(`[Cron] Schedule "${schedule.name}" is not on today (day ${dayOfWeek}), skipping`);
            continue;
        }
        const existingTask = await prisma_1.prisma.task.findFirst({
            where: {
                userId: schedule.userId,
                title: schedule.name,
                startDate: { lte: todayEnd },
                endDate: { gte: today }
            }
        });
        if (existingTask) {
            console.log(`[Cron] Task for "${schedule.name}" already exists for today, skipping`);
            continue;
        }
        tasksToCreate.push({
            userId: schedule.userId,
            title: schedule.name,
            type: schedule.type,
            points: schedule.points || 1,
            startDate: today,
            endDate: todayEnd, // 当日任务只当天有效，到今天结束就过期
            isCompleted: false
        });
        console.log(`[Cron] Will create task: "${schedule.name}" for user ${schedule.userId}`);
    }
    if (tasksToCreate.length > 0) {
        await prisma_1.prisma.task.createMany({
            data: tasksToCreate
        });
        console.log(`[Cron] Created ${tasksToCreate.length} tasks`);
    }
    else {
        console.log(`[Cron] No tasks to create`);
    }
    console.log(`[Cron] Daily task generation completed`);
}
//# sourceMappingURL=dailyTask.js.map