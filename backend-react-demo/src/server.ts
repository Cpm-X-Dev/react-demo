import { buildApplication } from "./app.js";

const startServer = async () => {
    const app = buildApplication();
    const PORT = 4000;

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();