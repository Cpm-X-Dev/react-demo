export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export interface IToken {
    generateAccessToken: (payload: TokenPayload) => string;
    generateRefreshToken: (payload: TokenPayload) => string;
    verifyAccessToken: (token: string) => TokenPayload | null;
    verifyRefreshToken: (token: string) => TokenPayload | null;
}
