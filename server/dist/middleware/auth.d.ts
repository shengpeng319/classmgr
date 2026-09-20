import { Context, Next } from 'koa';
import { TokenPayload } from '../utils/jwt';
export interface AuthState {
    user: TokenPayload;
}
export declare const authMiddleware: (ctx: Context, next: Next) => Promise<void>;
export declare const adminMiddleware: (ctx: Context, next: Next) => Promise<void>;
//# sourceMappingURL=auth.d.ts.map