import type { ApiConfig } from "../_Models/Types/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../Config/backend/api-config.json");

const API_CONFIG_MAP = new Map();
const API_CONFIG_NAME = "__API_CONFIG";

export const getApiConfig = (): ApiConfig => {
    let _apiConfig: ApiConfig = API_CONFIG_MAP.get(API_CONFIG_NAME);

    if (_apiConfig) {
        console.log("🚀 ~ API Configuration Loaded. Using cached configuration.");
        return _apiConfig;
    }

    try {
        _apiConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

        if (!Object.keys(_apiConfig).length) {
            throw new Error("Error. API Configuration file is empty.");
        }

        _apiConfig = {
            ..._apiConfig,
            authConfig: {
                ..._apiConfig.authConfig,
                cookieMaxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
            }
        }

        API_CONFIG_MAP.set(API_CONFIG_NAME, _apiConfig);
    } catch (error) {
        console.error("🚀 ~ getApiConfig ~ error:", error);
        throw new Error("Error. Could not read API Configuration.");
    }
    
    console.log("✅ API configuration loaded");
    console.log("🚀 ~ getApiConfig ~ _apiConfig:", _apiConfig);

    return _apiConfig;
}