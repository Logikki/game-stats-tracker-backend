import express, { Express, Request, Response } from 'express';
import { User } from '@models/common/User';
import { SALT_ROUNDS } from '@utils/config';
import { hash } from 'bcrypt';

const userRouter = express.Router();

userRouter.post('/user', async (req: Request, res: Response) => {
    const { username, name, password, email } = req.body;
    if (!username || !name || !password || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    const passwordHash = await hash(password, SALT_ROUNDS);
    const user = new User({ username, name, email, passwordHash });
    await user.save();
    res.status(201).json(user);
});

userRouter.get('/users', async (_req: Request, res: Response) => {
    const users = await User.find().populate({
        path: 'matches.matchId',
        model: 'BaseGame'
    });
    res.status(201).json(users);
});

export default userRouter;
