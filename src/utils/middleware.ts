import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '@models/common/User';
import { TokenPayload } from 'interfaces/TokenPayload';
import { JWT_SECRET } from './config';

export interface CustomRequest extends Request {
    token?: string;
    user?: IUser | null;
}

export const tokenExtractor = (req: CustomRequest, res: Response, next: NextFunction) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token != undefined) {
        req.token = token;
    }
    next();
};

export const userExtractor = async (req: CustomRequest, res: Response, next: NextFunction) => {
    if (req.token) {
        const decodedToken = jwt.verify(req.token, JWT_SECRET as string) as TokenPayload;
        const user = await User.findById(decodedToken.id);
        if (user != null) {
            req.user = user;
        } else {
            console.log('Invalid token');
        }
    } else {
        console.log('Missing token');
    }
    next();
};
