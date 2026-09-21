"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const koa_router_1 = __importDefault(require("koa-router"));
const course_1 = require("./course");
const record_1 = require("./record");
const card_1 = require("./card");
const lottery_1 = require("./lottery");
const auth_1 = require("./auth");
const user_1 = require("./user");
const profile_1 = require("./profile");
const task_1 = require("./task");
const schedule_1 = require("./schedule");
const presetPointItem_1 = require("./presetPointItem");
const ai_1 = require("./ai");
const v2_1 = require("./v2");
exports.router = new koa_router_1.default({ prefix: '/api/classmgr' });
// Register routes
(0, auth_1.authRoutes)(exports.router);
(0, user_1.userRoutes)(exports.router);
(0, profile_1.profileRoutes)(exports.router);
(0, course_1.courseRoutes)(exports.router);
(0, record_1.recordRoutes)(exports.router);
(0, card_1.cardRoutes)(exports.router);
(0, lottery_1.lotteryRoutes)(exports.router);
(0, task_1.taskRoutes)(exports.router);
(0, schedule_1.scheduleRoutes)(exports.router);
(0, presetPointItem_1.presetPointItemRoutes)(exports.router);
(0, ai_1.aiRoutes)(exports.router);
(0, v2_1.v2Routes)(exports.router);
//# sourceMappingURL=index.js.map