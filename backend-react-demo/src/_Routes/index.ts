import { type Express, type Request, type Response } from "express";
import { PingRouter } from "./PingRouter.js";
import { AuthRouter } from "./AuthRouter.js";

const CONFIG = {
    server: "localhost",
    version: "1.0.0",
    runDate: new Date().toISOString(),
}

const loadRoutes = (app: Express) => {
    app.use("/v1/auth", AuthRouter());
    app.use("/v1/ping", PingRouter());

    app.get("/", async (req: Request, res: Response) => {
        return res.status(200).json({
            Server: CONFIG.server,
            Version: CONFIG.version,
            RunDate: CONFIG.runDate,
        });
    });
};

export { loadRoutes };
