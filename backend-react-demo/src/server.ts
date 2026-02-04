import { loadRoutes } from "./_Routes/index.js";
import { buildApplication } from "./app.js";

const startServer = async () => {
    const app = buildApplication();
    const PORT = 4000;

    loadRoutes(app);

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();