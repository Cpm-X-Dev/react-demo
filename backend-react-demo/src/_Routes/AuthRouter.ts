import { Router } from "express";
import { AuthController } from "../_Controllers/AuthController.js";
import { AuthMiddleware } from "../_Middleware/authMiddleware.js";

export const AuthRouter = () => {
    const router: Router = Router();
    const { login, refresh, logout, logoutAll, me } = AuthController();
    const { requireAuth } = AuthMiddleware();

    // Public routes
    router.post("/login", login);
    router.post("/refresh", refresh);
    router.post("/logout", logout);

    // Protected routes
    router.post("/logout-all", requireAuth, logoutAll);
    router.get("/me", requireAuth, me);

    return router;
};
