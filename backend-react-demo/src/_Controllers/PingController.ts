import type { Request, RequestHandler, Response } from "express";
import type { IPingController } from "../_Models/Interfaces/IPingController.js"

export const PingController = (): IPingController => {
    const Ping: RequestHandler = (req: Request, res: Response) => {
        return res.status(200).json({
            Message: "PONG! 🚀 Hello, World!",
        });
    }

    return {
        Ping,
    };
}