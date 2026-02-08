import type { RequestHandler } from "express";

export interface IAuthMiddleware {
    requireAuth: RequestHandler;
    optionalAuth: RequestHandler;
}
