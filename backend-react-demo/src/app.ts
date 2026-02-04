import express, { type Express } from "express";
import cors from "cors";

const buildApplication = (): Express => {
    // This is the Express Application
    const app = express();
    
    // This is the CORS Configuration
    app.use(cors())

    return app;
}

export { buildApplication };