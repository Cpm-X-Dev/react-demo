import type { Request, Response, NextFunction } from "express";
import { JwtUtil } from "../_Utils/JwtUtil.js";
import type { IAuthMiddleware } from "../_Models/Interfaces/IAuthMiddleware.js";
import type { TokenPayload } from "../_Models/Interfaces/IToken.js";

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export const AuthMiddleware = (): IAuthMiddleware => {
    const jwtUtil = JwtUtil();

    const extractToken = (req: Request): string | null => {
        const authHeader = req.headers.authorization;

        if (!authHeader) return null;

        // Expected format: "Bearer <token>"
        const parts = authHeader.split(" ");
        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return null;
        }

        return parts[1] ?? null;
    };

    const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
        const token = extractToken(req);

        if (!token) {
            res.status(401).json({
                error: "Authentication required",
                code: "NO_TOKEN",
            });
            return;
        }

        const payload = jwtUtil.verifyAccessToken(token);

        if (!payload) {
            res.status(401).json({
                error: "Invalid or expired token",
                code: "INVALID_TOKEN",
            });
            return;
        }

        // Attach user info to request for downstream handlers
        req.user = payload;
        next();
    };

    // For routes that work with or without authentication
    const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
        const token = extractToken(req);

        if (token) {
            const payload = jwtUtil.verifyAccessToken(token);
            if (payload) {
                req.user = payload;
            }
        }

        next();
    };

    return {
        requireAuth,
        optionalAuth,
    };
};
