"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = async (ctx, next) => {
    const authHeader = ctx.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ctx.status = 401;
        ctx.body = { code: 401, message: 'Unauthorized: No token provided', data: null };
        return;
    }
    const token = authHeader.substring(7);
    const payload = (0, jwt_1.verifyToken)(token);
    if (!payload) {
        ctx.status = 401;
        ctx.body = { code: 401, message: 'Unauthorized: Invalid token', data: null };
        return;
    }
    ctx.state.user = payload;
    await next();
};
exports.authMiddleware = authMiddleware;
const adminMiddleware = async (ctx, next) => {
    const user = ctx.state.user;
    if (!user || user.role !== 'admin') {
        ctx.status = 403;
        ctx.body = { code: 403, message: 'Forbidden: Admin access required', data: null };
        return;
    }
    await next();
};
exports.adminMiddleware = adminMiddleware;
//# sourceMappingURL=auth.js.map