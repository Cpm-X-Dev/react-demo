import type { Request, Response } from "express";
import { AuthService } from "../_Services/AuthService.js";
import { getApiConfig } from "../_Config/getApiConfig.js";
import type { IAuthController } from "../_Models/Interfaces/IAuthController.js";
import type { TokenMetadata } from "../_Models/Interfaces/IAuthService.js";

export const AuthController = (): IAuthController => {
    const authService = AuthService();
    const config = getApiConfig();

    const getCookieOptions = () => ({
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
        maxAge: config.authConfig.cookieMaxAge,
        path: "/",
    });

    const getMetadata = (req: Request): TokenMetadata => ({
        ...(req.headers["user-agent"] && { userAgent: req.headers["user-agent"] }),
        ...(req.ip && { ipAddress: req.ip }),
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

        const result = await authService.login(email, password, getMetadata(req));

        if (!result.success) {
            res.status(401).json({
                error: result.error,
                code: result.code,
            });
            return;
        }

        res.cookie(config.authConfig.refreshTokenCookieName, result.refreshToken, getCookieOptions());

        res.status(200).json({
            accessToken: result.accessToken,
            user: result.user,
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

        const result = authService.refresh(refreshToken, getMetadata(req));

        if (!result.success) {
            res.clearCookie(config.authConfig.refreshTokenCookieName);
            res.status(401).json({
                error: result.error,
                code: result.code,
            });
            return;
        }

        res.cookie(config.authConfig.refreshTokenCookieName, result.refreshToken, getCookieOptions());

        res.status(200).json({
            accessToken: result.accessToken,
        });
    };

    const logout = async (req: Request, res: Response): Promise<void> => {
        const refreshToken = req.cookies?.[config.authConfig.refreshTokenCookieName];

        if (refreshToken) {
            authService.logout(refreshToken);
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

        const count = authService.logoutAll(req.user.userId);
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
            activeSessionCount: authService.getSessionCount(req.user.userId),
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
