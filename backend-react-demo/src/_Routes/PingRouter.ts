import { Router } from "express";
import { PingController } from "../_Controllers/PingController.js";

export const PingRouter = () => {
    const router: Router = Router();
    const { Ping } = PingController();

    router.get("/", Ping);

    return router;
}