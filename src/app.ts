import express, { Express } from 'express';
import { MONGO_DB_URI } from '@utils/config';
import { connect } from 'mongoose';
import cors from 'cors';
import gamesRouter from '@controllers/gameRouter';
import userRouter from '@controllers/userRouter';
import loginRouter from '@controllers/loginRouter';
import leagueRouter from '@controllers/leagueRouter';
import { tokenExtractor, userExtractor } from '@utils/middleware';

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(tokenExtractor);
app.use(userExtractor);
app.use('/api', gamesRouter);
app.use('/api', userRouter);
app.use('/api', loginRouter);
app.use('/api', leagueRouter);

if (process.env.NODE_ENV !== 'test') {
    async function run() {
        await connect(MONGO_DB_URI);
    }

    run().catch((err) => console.log(err));
}

export default app;
