import { PORT } from '@utils/config';
import app from 'app';

const port = PORT ?? '9001';

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
