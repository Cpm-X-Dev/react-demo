import { type RequestHandler } from "express";

export interface IPingController {
    Ping: RequestHandler;
}