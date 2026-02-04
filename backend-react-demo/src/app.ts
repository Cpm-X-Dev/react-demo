import express, { type Express } from "express";
import cors from "cors";

const CORS_OPTIONS = {
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
};

const buildApplication = (): Express => {
    // This is the Express Application
    const app = express();
    
    // This is the CORS Configuration
    app.use(cors(CORS_OPTIONS));
    // This is the JSON Parser
    app.use(express.json());

    return app;
}

export { buildApplication };