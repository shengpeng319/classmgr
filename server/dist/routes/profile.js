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
exports.profileRoutes = profileRoutes;
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const UPLOAD_DIR = path.join(__dirname, '../../uploads/avatars');
function ensureUploadDir() {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
}
function profileRoutes(router) {
    router.post('/profile/avatar', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const { avatar } = ctx.request.body;
        if (!avatar || !avatar.startsWith('data:image')) {
            ctx.status = 400;
            ctx.body = { code: 400, message: 'Invalid avatar data', data: null };
            return;
        }
        ensureUploadDir();
        const base64Data = avatar.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${userId}_${Date.now()}.jpg`;
        const filepath = path.join(UPLOAD_DIR, filename);
        fs.writeFileSync(filepath, buffer);
        const avatarUrl = `/uploads/avatars/${filename}`;
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: avatarUrl }
        });
        ctx.body = { code: 0, message: 'ok', data: { avatar: avatarUrl } };
    });
    router.put('/profile', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const { name, avatar, gender, age, phone } = ctx.request.body;
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (avatar !== undefined && !avatar.startsWith('data:image'))
            updateData.avatar = avatar;
        if (gender !== undefined)
            updateData.gender = gender;
        if (age !== undefined)
            updateData.age = age;
        if (phone !== undefined)
            updateData.phone = phone;
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                role: true,
                name: true,
                avatar: true,
                gender: true,
                age: true,
                phone: true,
                createdAt: true,
                updatedAt: true
            }
        });
        ctx.body = { code: 0, message: 'ok', data: user };
    });
    router.get('/profile', auth_1.authMiddleware, async (ctx) => {
        const userId = ctx.state.user.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                name: true,
                avatar: true,
                gender: true,
                age: true,
                phone: true,
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
}
//# sourceMappingURL=profile.js.map