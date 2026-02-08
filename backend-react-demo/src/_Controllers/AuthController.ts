import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { JwtUtil } from "../_Utils/JwtUtil.js";
import { RefreshTokenStore } from "../_Services/RefreshTokenStore.js";
import { findUserByEmail } from "../_Models/_Mocks/mockUsers.js";
import { getApiConfig } from "../_Config/getApiConfig.js";
import type { IAuthController } from "../_Models/Interfaces/IAuthController.js";
import type { TokenPayload } from "../_Models/Interfaces/IToken.js";

export const AuthController = (): IAuthController => {
    const jwtUtil = JwtUtil();
    const config = getApiConfig();

    const getCookieOptions = () => ({
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: config.authConfig.cookieMaxAge,
        path: "/",
    });

    const login = async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({
                error: "Email and password are required",
                code: "MISSING_CREDENTIALS",
            });
            return;
        }

        const user = findUserByEmail(email);
        if (!user) {
            res.status(401).json({
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
            res.status(401).json({
                error: "Invalid email or password",
                code: "INVALID_CREDENTIALS",
            });
            return;
        }

        const tokenPayload: TokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        const accessToken = jwtUtil.generateAccessToken(tokenPayload);
        const refreshToken = jwtUtil.generateRefreshToken(tokenPayload);

        RefreshTokenStore.store(user.id, refreshToken, {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
        });

        res.cookie(config.authConfig.refreshTokenCookieName, refreshToken, getCookieOptions());

        res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        });
    };

    const refresh = async (req: Request, res: Response): Promise<void> => {
        const refreshToken = req.cookies?.[config.authConfig.refreshTokenCookieName];

        if (!refreshToken) {
            res.status(401).json({
                error: "Refresh token not found",
                code: "NO_REFRESH_TOKEN",
            });
            return;
        }

        const payload = jwtUtil.verifyRefreshToken(refreshToken);
        if (!payload) {
            res.clearCookie(config.authConfig.refreshTokenCookieName);
            res.status(401).json({
                error: "Invalid or expired refresh token",
                code: "INVALID_REFRESH_TOKEN",
            });
            return;
        }

        const isValid = RefreshTokenStore.validate(payload.userId, refreshToken);
        if (!isValid) {
            res.clearCookie(config.authConfig.refreshTokenCookieName);
            res.status(401).json({
                error: "Refresh token has been revoked",
                code: "REVOKED_REFRESH_TOKEN",
            });
            return;
        }

        // Token rotation: issue new tokens and revoke old
        const newAccessToken = jwtUtil.generateAccessToken(payload);
        const newRefreshToken = jwtUtil.generateRefreshToken(payload);

        RefreshTokenStore.revoke(payload.userId, refreshToken);
        RefreshTokenStore.store(payload.userId, newRefreshToken, {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
        });

        res.cookie(config.authConfig.refreshTokenCookieName, newRefreshToken, getCookieOptions());

        res.status(200).json({
            accessToken: newAccessToken,
        });
    };

    const logout = async (req: Request, res: Response): Promise<void> => {
        const refreshToken = req.cookies?.[config.authConfig.refreshTokenCookieName];

        if (refreshToken) {
            const payload = jwtUtil.verifyRefreshToken(refreshToken);
            if (payload) {
                RefreshTokenStore.revoke(payload.userId, refreshToken);
            }
        }

        res.clearCookie(config.authConfig.refreshTokenCookieName);
        res.status(200).json({ message: "Logged out successfully" });
    };

    const logoutAll = async (req: Request, res: Response): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
                code: "NO_AUTH",
            });
            return;
        }

        const count = RefreshTokenStore.revokeAllForUser(req.user.userId);
        res.clearCookie(config.authConfig.refreshTokenCookieName);

        res.status(200).json({
            message: `Logged out from ${count} device(s)`,
            devicesLoggedOut: count,
        });
    };

    const me = async (req: Request, res: Response): Promise<void> => {
        if (!req.user) {
            res.status(401).json({
                error: "Authentication required",
                code: "NO_AUTH",
            });
            return;
        }

        res.status(200).json({
            user: req.user,
            activeSessionCount: RefreshTokenStore.getActiveTokenCount(req.user.userId),
        });
    };

    return {
        login,
        refresh,
        logout,
        logoutAll,
        me,
    };
};
