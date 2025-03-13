import { Request, Response } from 'express';
import { User } from '../models/common/User';
import { SALT_ROUNDS } from '../utils/config';
import { hash } from 'bcrypt';

export const createUser = async (req: Request, res: Response) => {
    const { username, name, password, email } = req.body;
    if (!username || !name || !password || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    const passwordHash = await hash(password, SALT_ROUNDS);
    const user = new User({ username, name, email, passwordHash });
    await user.save();
    res.status(201).json(user);
};
