"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = async (ctx, next) => {
    try {
        await next();
    }
    catch (error) {
        ctx.status = error.status || 500;
        ctx.body = {
            code: error.status || 500,
            message: error.message || 'Internal Server Error',
            data: null
        };
    }
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map