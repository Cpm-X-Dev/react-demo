/**
 * Auth Service - Business logic for authentication.
 *
 * Handles credential validation, token generation, and session management.
 * Does NOT handle HTTP concerns (that's the controller's job).
 */

import bcrypt from "bcryptjs";
import { JwtUtil } from "../_Utils/JwtUtil.js";
import { RefreshTokenStore } from "./RefreshTokenStore.js";
import { UserRepository } from "./UserRepository.js";
import type { TokenPayload } from "../_Models/Interfaces/IToken.js";
import type {
    IAuthService,
    LoginResult,
    RefreshResult,
    TokenMetadata,
} from "../_Models/Interfaces/IAuthService.js";

export const AuthService = (): IAuthService => {
    const jwtUtil = JwtUtil();

    const login = async (
        email: string,
        password: string,
        metadata?: TokenMetadata
    ): Promise<LoginResult> => {
        const user = UserRepository.findByEmail(email);

        if (!user) {
            return {
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            };
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (!isValid) {
            return {
                success: false,
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            };
        }

        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = jwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = jwtUtil.generateRefreshToken(tokenPayload);

        // Store refresh token for revocation tracking
        RefreshTokenStore.store(user.id, refreshToken, metadata);

        return {
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    };

    const refresh = (
        refreshToken: string,
        metadata?: TokenMetadata
    ): RefreshResult => {
        const payload = jwtUtil.verifyRefreshToken(refreshToken);

        if (!payload) {
            return {
                success: false,
                error: "Invalid or expired refresh token",
                code: "INVALID_REFRESH_TOKEN",
            };
        }

        const isValid = RefreshTokenStore.validate(payload.userId, refreshToken);

        if (!isValid) {
            return {
                success: false,
                error: "Refresh token has been revoked",
                code: "REVOKED_REFRESH_TOKEN",
            };
        }

        // Token rotation
        const newAccessToken = jwtUtil.generateAccessToken(payload);
        const newRefreshToken = jwtUtil.generateRefreshToken(payload);

        RefreshTokenStore.revoke(payload.userId, refreshToken);
        RefreshTokenStore.store(payload.userId, newRefreshToken, metadata);

        return {
            success: true,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    };

    const logout = (refreshToken: string): void => {
        const payload = jwtUtil.verifyRefreshToken(refreshToken);

        if (payload) {
            RefreshTokenStore.revoke(payload.userId, refreshToken);
        }
    };

    const logoutAll = (userId: string): number => {
        return RefreshTokenStore.revokeAllForUser(userId);
    };

    const getSessionCount = (userId: string): number => {
        return RefreshTokenStore.getActiveTokenCount(userId);
    };

    return {
        login,
        refresh,
        logout,
        logoutAll,
        getSessionCount,
    };
};
