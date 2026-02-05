import type { FeConfig } from "shared-types";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "../../Config/backend/app-config.json");

const APP_CONFIG_MAP = new Map();
const APP_CONFIG_NAME = "__APP_CONFIG";

export const getAppConfig = async (): Promise<FeConfig> => {
    let _appConfig: FeConfig = APP_CONFIG_MAP.get(APP_CONFIG_NAME);

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