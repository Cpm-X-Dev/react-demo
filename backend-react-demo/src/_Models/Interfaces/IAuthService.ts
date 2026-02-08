import type { IUser } from "./IUser.js";

export interface TokenMetadata {
    userAgent?: string;
    ipAddress?: string;
}

export interface LoginSuccess {
    success: true;
    accessToken: string;
    refreshToken: string;
    user: Pick<IUser, "id" | "email" | "role">;
}

export interface LoginFailure {
    success: false;
    error: string;
    code: string;
}

export type LoginResult = LoginSuccess | LoginFailure;

export interface RefreshSuccess {
    success: true;
    accessToken: string;
    refreshToken: string;
}

export interface RefreshFailure {
    success: false;
    error: string;
    code: string;
}

export type RefreshResult = RefreshSuccess | RefreshFailure;

export interface IAuthService {
    login: (
        email: string,
        password: string,
        metadata?: TokenMetadata
    ) => Promise<LoginResult>;
    refresh: (
        refreshToken: string,
        metadata?: TokenMetadata
    ) => RefreshResult;
    logout: (refreshToken: string) => void;
    logoutAll: (userId: string) => number;
    getSessionCount: (userId: string) => number;
}
