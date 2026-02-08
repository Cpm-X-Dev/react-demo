import jwt, { type SignOptions, type JwtPayload } from "jsonwebtoken";
import { getApiConfig } from "../_Config/getApiConfig.js";
import type { IToken, TokenPayload } from "../_Models/Interfaces/IToken.js";

export const JwtUtil = (): IToken => {
    const config = getApiConfig();

    const generateAccessToken = (payload: TokenPayload): string => {
        const options: SignOptions = {
            expiresIn: config.authConfig.accessTokenExpiry,
            algorithm: "HS256",
        };
        return jwt.sign(payload, config.authConfig.accessTokenSecret, options);
    };

    const generateRefreshToken = (payload: TokenPayload): string => {
        const options: SignOptions = {
            expiresIn: config.authConfig.refreshTokenExpiry,
            algorithm: "HS256",
        };
        return jwt.sign(payload, config.authConfig.refreshTokenSecret, options);
    };

    const verifyAccessToken = (token: string): TokenPayload | null => {
        try {
            const decoded = jwt.verify(token, config.authConfig.accessTokenSecret) as JwtPayload & TokenPayload;
            return {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        } catch {
            return null;
        }
    };

    const verifyRefreshToken = (token: string): TokenPayload | null => {
        try {
            const decoded = jwt.verify(token, config.authConfig.refreshTokenSecret) as JwtPayload & TokenPayload;
            return {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role,
            };
        } catch {
            return null;
        }
    };

    return {
        generateAccessToken,
        generateRefreshToken,
        verifyAccessToken,
        verifyRefreshToken,
    };
};
