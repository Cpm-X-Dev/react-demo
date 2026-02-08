import bcrypt from "bcryptjs";
import { getApiConfig } from "./_Config/getApiConfig.js";
import { loadRoutes } from "./_Routes/index.js";
import { buildApplication } from "./app.js";
import { initializeMockUsers } from "./_Models/_Mocks/mockUsers.js";

const startServer = async () => {
    const apiConfig = getApiConfig();
    
    if (!apiConfig) {
        throw new Error("Error. API Configuration is not loaded. Server startup failed.");
    }

    if (apiConfig.demoSettings.useMockData) {
        console.warn("⚠️  [DEMO] Using mock data. Set USE_MOCK_DATA to false in production!");
        // Initialize mock users with bcrypt hashing
        await initializeMockUsers((password) => bcrypt.hash(password, 10));
    }

    const app = buildApplication();
    const PORT = 4000;

    loadRoutes(app);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();