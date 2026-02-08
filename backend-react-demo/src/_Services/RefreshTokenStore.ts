/**
 * In-memory refresh token store for demo purposes.
 *
 * PRODUCTION WARNING: Use Redis or a database table instead!
 * This store is lost on server restart and doesn't scale horizontally.
 */

interface StoredToken {
    userId: string;
    token: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

export interface IRefreshTokenStore {
    store: (
        userId: string,
        token: string,
        metadata?: { userAgent?: string; ipAddress?: string }
    ) => void;
    validate: (userId: string, token: string) => boolean;
    revoke: (userId: string, token: string) => boolean;
    revokeAllForUser: (userId: string) => number;
    getActiveTokenCount: (userId: string) => number;
}

const createRefreshTokenStore = (): IRefreshTokenStore => {
    // Map: userId -> array of tokens (supports multiple devices)
    const tokenStore = new Map<string, StoredToken[]>();

    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const MAX_SESSIONS_PER_USER = 5;

    const cleanExpiredTokens = (userId: string): void => {
        const tokens = tokenStore.get(userId);
        if (!tokens) return;

        const now = new Date();
        const validTokens = tokens.filter((t) => t.expiresAt > now);

        if (validTokens.length === 0) {
            tokenStore.delete(userId);
        } else {
            tokenStore.set(userId, validTokens);
        }
    };

    const store = (
        userId: string,
        token: string,
        metadata?: { userAgent?: string; ipAddress?: string }
    ): void => {
        cleanExpiredTokens(userId);

        const storedToken: StoredToken = {
            userId,
            token,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
            ...(metadata?.userAgent && { userAgent: metadata.userAgent }),
            ...(metadata?.ipAddress && { ipAddress: metadata.ipAddress }),
        };

        const existingTokens = tokenStore.get(userId) || [];

        // Limit active sessions per user (security measure)
        if (existingTokens.length >= MAX_SESSIONS_PER_USER) {
            existingTokens.shift(); // Remove oldest
        }

        existingTokens.push(storedToken);
        tokenStore.set(userId, existingTokens);
    };

    const validate = (userId: string, token: string): boolean => {
        cleanExpiredTokens(userId);

        const tokens = tokenStore.get(userId);
        if (!tokens) return false;

        return tokens.some((t) => t.token === token);
    };

    const revoke = (userId: string, token: string): boolean => {
        const tokens = tokenStore.get(userId);
        if (!tokens) return false;

        const initialLength = tokens.length;
        const filtered = tokens.filter((t) => t.token !== token);

        if (filtered.length === 0) {
            tokenStore.delete(userId);
        } else {
            tokenStore.set(userId, filtered);
        }

        return filtered.length < initialLength;
    };

    const revokeAllForUser = (userId: string): number => {
        const tokens = tokenStore.get(userId);
        const count = tokens?.length || 0;
        tokenStore.delete(userId);
        return count;
    };

    const getActiveTokenCount = (userId: string): number => {
        cleanExpiredTokens(userId);
        return tokenStore.get(userId)?.length || 0;
    };

    return {
        store,
        validate,
        revoke,
        revokeAllForUser,
        getActiveTokenCount,
    };
};

// Singleton instance
export const RefreshTokenStore = createRefreshTokenStore();
