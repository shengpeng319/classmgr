export interface TokenPayload {
    userId: string;
    username: string;
    role: string;
}
export declare function generateToken(payload: TokenPayload): string;
export declare function verifyToken(token: string): TokenPayload | null;
//# sourceMappingURL=jwt.d.ts.map