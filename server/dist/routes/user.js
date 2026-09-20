"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = userRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
function userRoutes(router) {
    router.get('/users', auth_1.authMiddleware, async (ctx) => {
        const users = await prisma_1.prisma.user.findMany({
            select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
                role: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        ctx.body = { code: 0, message: 'ok', data: users };
    });
    router.get('/users/:id', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.params.id;
        const currentUser = ctx.state.user;
        if (currentUser.userId !== userId && currentUser.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden', data: null };
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            ctx.status = 404;
            ctx.body = { code: 404, message: 'User not found', data: null };
            return;
        }
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    router.post('/users', auth_1.authMiddleware, auth_1.adminMiddleware, async (ctx) => {
        const { username, password, role } = ctx.request.body;
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Username and password are required', data: null };
            return;
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { username }
        });
        if (existingUser) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Username already exists', data: null };
            return;
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const userRole = role === 'admin' ? 'admin' : 'user';
        const user = await prisma_1.prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: userRole
            },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true
            }
        });
        ctx.status = 201;
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    router.put('/users/:id', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.params.id;
        const currentUser = ctx.state.user;
        const { password, role } = ctx.request.body;
        if (currentUser.userId !== userId && currentUser.role !== 'admin') {
            ctx.status = 403;
            ctx.body = { code: 403, message: 'Forbidden', data: null };
            return;
        }
        const updateData = {};
        if (password) {
            updateData.password = await bcryptjs_1.default.hash(password, 10);
        }
        if (role && currentUser.role === 'admin') {
            updateData.role = role;
        }
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    router.delete('/users/:id', auth_1.authMiddleware, auth_1.adminMiddleware, async (ctx) => {
        const userId = ctx.params.id;
        const currentUser = ctx.state.user;
        if (currentUser.userId === userId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Cannot delete yourself', data: null };
            return;
        }
        await prisma_1.prisma.user.delete({
            where: { id: userId }
        });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
}
//# sourceMappingURL=user.js.map