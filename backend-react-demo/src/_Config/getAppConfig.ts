import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ApiConfig } from "../_Models/Types/ApiConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../Config/backend/app-config.json");

const APP_CONFIG_MAP = new Map();
const APP_CONFIG_NAME = "__APP_CONFIG";

export const getAppConfig = async (): Promise<ApiConfig> => {
    let _appConfig: ApiConfig = APP_CONFIG_MAP.get(APP_CONFIG_NAME);

    if (_appConfig) {
        console.log("🚀 ~ App Configuration Loaded. Using cached configuration.");
        return _appConfig;
    }

    try {
        _appConfig = JSON.parse(await fs.readFile(CONFIG_PATH, "utf8"));

        if (!Object.keys(_appConfig).length) {
            throw new Error("Error. App Configuration file is empty.");
        }

        APP_CONFIG_MAP.set(APP_CONFIG_NAME, _appConfig);
    } catch (error) {
        console.error("🚀 ~ getAppConfig ~ error:", error);
        throw new Error("Error. Could not read App Configuration.");
    }

    return _appConfig;
}