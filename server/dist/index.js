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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const dailyTask_1 = require("./cron/dailyTask");
const classRemind_1 = require("./cron/classRemind");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const app = new koa_1.default();
(0, dailyTask_1.startDailyTaskCron)();
(0, classRemind_1.startClassRemindCron)();
// 启动时自动补齐今天的任务（防止 cron 00:15 时机器关机/休眠导致漏生成）
(0, dailyTask_1.generateDailyTasks)().catch(e => console.error('[Startup] Failed to backfill today tasks:', e));
app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${new Date().toISOString()} ${ctx.method} ${ctx.url} → ${ctx.status} (${ms}ms)`);
    if (ctx.status >= 400) {
        console.log(`  Error body: ${JSON.stringify(ctx.body)}`);
    }
});
app.use(errorHandler_1.errorHandler);
app.use(async (ctx, next) => {
    ctx.set('Access-Control-Allow-Origin', '*');
    ctx.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (ctx.method === 'OPTIONS') {
        ctx.status = 204;
        return;
    }
    await next();
});
app.use(async (ctx, next) => {
    if (ctx.request.headers['content-type'] === 'application/json') {
        try {
            const chunks = [];
            for await (const chunk of ctx.req) {
                chunks.push(chunk);
            }
            const body = Buffer.concat(chunks).toString();
            if (body && body.length < 10 * 1024 * 1024) { // 10MB limit
                ctx.request.body = JSON.parse(body);
            }
        }
        catch (e) {
            // ignore parse errors
        }
    }
    await next();
});
// Serve avatar files
app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/uploads/')) {
        const filepath = path.join(__dirname, '..', ctx.path);
        if (fs.existsSync(filepath)) {
            ctx.type = 'image/jpeg';
            ctx.body = fs.createReadStream(filepath);
            return;
        }
    }
    await next();
});
app.use(routes_1.router.routes());
app.use(routes_1.router.allowedMethods());
app.use(async (ctx, next) => {
    if (ctx.path === '/health') {
        ctx.body = { code: 0, message: 'ok', data: { status: 'running', minSupportedVersion: '2.0.0' } };
        return;
    }
    await next();
});
const PORT = Number(process.env.CLSMGR_BACKEND_PORT || 3000);
const HOST = process.env.CLSMGR_HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map