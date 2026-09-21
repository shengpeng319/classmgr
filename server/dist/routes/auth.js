"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = authRoutes;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const prisma_1 = require("../utils/prisma");
const jwt_1 = require("../utils/jwt");
function generateRememberToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function authRoutes(router) {
    router.post('/auth/register', async (ctx) => {
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
            }
        });
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            username: user.username,
            role: user.role
        });
        ctx.status = 201;
        ctx.body = {
            code: 0,
            message: 'ok',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role,
                    name: user.name,
                    gender: user.gender,
                    age: user.age,
                    phone: user.phone
                }
            }
        };
    });
    router.post('/auth/login', async (ctx) => {
        const { username, password, deviceId, remember } = ctx.request.body;
        if (!username || !password) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Username and password are required', data: null };
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { username }
        });
        if (!user) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Invalid username or password', data: null };
            return;
        }
        // 多家庭改造：已迁移成 Child 档案的旧孩子账号，禁止登录
        if (user.role === 'user' || (user.familyId && user.role === 'parent' &&
            await prisma_1.prisma.child.findFirst({ where: { familyId: user.familyId, name: user.name || '' } }))) {
            ctx.status = 403;
            ctx.body = { code: 403, message: '孩子账号已并入家庭档案，请用家长账号登录', data: null };
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!isValidPassword) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Invalid username or password', data: null };
            return;
        }
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            username: user.username,
            role: user.role
        });
        const responseData = {
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                gender: user.gender,
                age: user.age,
                phone: user.phone
            }
        };
        // Only send avatar if it's a URL/path, not base64
        if (user.avatar && !user.avatar.startsWith('data:image')) {
            responseData.user.avatar = user.avatar;
        }
        if (remember && deviceId) {
            const rememberToken = generateRememberToken();
            await prisma_1.prisma.rememberedUser.upsert({
                where: {
                    userId_deviceId: {
                        userId: user.id,
                        deviceId
                    }
                },
                update: {
                    rememberToken
                },
                create: {
                    userId: user.id,
                    deviceId,
                    rememberToken
                }
            });
            responseData.rememberToken = rememberToken;
        }
        ctx.body = {
            code: 0,
            message: 'ok',
            data: responseData
        };
    });
    router.post('/auth/quick-login', async (ctx) => {
        const { rememberToken, deviceId } = ctx.request.body;
        if (!rememberToken || !deviceId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Missing remember token or device ID', data: null };
            return;
        }
        const remembered = await prisma_1.prisma.rememberedUser.findUnique({
            where: {
                userId_deviceId: {
                    userId: '', // placeholder
                    deviceId
                }
            },
            include: { user: true }
        });
        const found = await prisma_1.prisma.rememberedUser.findFirst({
            where: {
                rememberToken,
                deviceId
            },
            include: { user: true }
        });
        if (!found || !found.user) {
            ctx.status = 401;
            ctx.body = { code: 401, message: 'Invalid remember token', data: null };
            return;
        }
        const user = found.user;
        const token = (0, jwt_1.generateToken)({
            userId: user.id,
            username: user.username,
            role: user.role
        });
        const userData = {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            gender: user.gender,
            age: user.age,
            phone: user.phone
        };
        if (user.avatar && !user.avatar.startsWith('data:image')) {
            userData.avatar = user.avatar;
        }
        ctx.body = {
            code: 0,
            message: 'ok',
            data: {
                token,
                user: userData
            }
        };
    });
    router.get('/auth/remembered-users/:deviceId', async (ctx) => {
        const { deviceId } = ctx.params;
        const remembered = await prisma_1.prisma.rememberedUser.findMany({
            where: { deviceId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        role: true,
                        name: true,
                        avatar: true,
                        gender: true,
                        age: true,
                        phone: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        ctx.body = {
            code: 0,
            message: 'ok',
            data: remembered.map(r => {
                const { avatar, ...rest } = r.user;
                return {
                    ...rest,
                    ...(avatar && !avatar.startsWith('data:image') ? { avatar } : {})
                };
            })
        };
    });
    router.delete('/auth/remembered-user/:userId', async (ctx) => {
        const { userId } = ctx.params;
        const { deviceId } = ctx.query;
        if (!deviceId) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Missing device ID', data: null };
            return;
        }
        await prisma_1.prisma.rememberedUser.deleteMany({
            where: {
                userId,
                deviceId
            }
        });
        ctx.body = { code: 0, message: 'ok', data: null };
    });
}
//# sourceMappingURL=auth.js.map