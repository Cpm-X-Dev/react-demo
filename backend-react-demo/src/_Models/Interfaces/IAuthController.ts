import type { RequestHandler } from "express";

export interface IAuthController {
    login: RequestHandler;
    refresh: RequestHandler;
    logout: RequestHandler;
    logoutAll: RequestHandler;
    me: RequestHandler;
}
