import Router from 'koa-router';
import { Context, Next } from 'koa';
export declare const familyScope: (ctx: Context, next: Next) => Promise<void>;
export declare function childInScope(ctx: Context, childId: string): Promise<{
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    avatar: string | null;
    gender: string;
    points: number;
    familyId: string;
} | null>;
export declare function v2Routes(router: Router): void;
export declare function blockMigratedChildLogin(ctx: Context, next: Next): Promise<void>;
//# sourceMappingURL=v2.d.ts.map