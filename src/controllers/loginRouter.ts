import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { JWT_SECRET } from '../utils/config';
import { User } from '@models/common/User';
import { TokenPayload } from 'interfaces/TokenPayload';

const loginRouter = express.Router();

loginRouter.post('/login', async (request: Request, response: Response) => {
    const { username, password } = request.body;
    const user = await User.findOne({ username });
    console.log(user);
    const passwordCorrect = user && user.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordCorrect) {
        response.status(401).json({ error: 'invalid username or password' });
        return;
    }

    const userForToken: TokenPayload = {
        name: user.name,
        username: user.username,
        id: user.id
    };

    const token = jwt.sign(userForToken, JWT_SECRET, {
        expiresIn: '1h'
    });

    response.status(200).json({ token, username: user.username, name: user.name });
});

export default loginRouter;
