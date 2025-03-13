import { PORT } from "./utils/config";
import app from "./app";

const port = PORT ?? '3001';

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
