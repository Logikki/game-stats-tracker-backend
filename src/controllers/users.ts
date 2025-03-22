import { Request, Response } from 'express';
import { User } from '../models/common/User';
import { SALT_ROUNDS } from '../utils/config';
import { hash } from 'bcrypt';
import { MiddleWare, TokenPayload } from 'src/interfaces/express';

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

export const getUser: MiddleWare = async (req, res, next) => {
    const user = req.user;

    if (!user) {
        res.status(404).send('User not found');
        return;
    }

    console.log(user);
    const response = await User.findById(user.id)
        .populate({
            path: 'leagues',
            populate: [
                { path: 'users', model: 'User', select: 'name' },
                { path: 'matches', model: 'BaseGame' }
            ]
        })
        .populate({
            path: 'matches',
            populate: [
                { path: 'homePlayer', model: 'User', select: 'username' },
                { path: 'awayPlayer', model: 'User', select: 'username' }
            ]
        });
    res.status(200).json(response);
};

export const getUsers: MiddleWare = async (_req, res, _next) => {
    const users = await User.find()
        .populate({
            path: 'leagues',
            populate: [
                { path: 'users', model: 'User', select: 'name' },
                { path: 'matches', model: 'BaseGame' }
            ]
        })
        .populate({
            path: 'matches',
            populate: [
                { path: 'homePlayer', model: 'User', select: 'username' },
                { path: 'awayPlayer', model: 'User', select: 'username' }
            ]
        });
    res.status(201).json(users);
};
