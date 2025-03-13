import express, { Express } from 'express';
import { MONGO_DB_URI } from './utils/config';
import { connect } from 'mongoose';
import cors from 'cors';
import router from './router';

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use('/api', router);

if (process.env.NODE_ENV !== 'test') {
    async function run() {
        await connect(MONGO_DB_URI);
    }

    run().catch((err) => console.log(err));
}

export default app;
