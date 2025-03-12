import jwt from 'jsonwebtoken';
import { IUser, User } from '@models/common/User';
import { MiddleWare, TokenPayload, TrackerApiRequest } from '@interfaces/express';
import { JWT_SECRET } from './config';
import { League } from '@models/league/League';

export const validateToken: MiddleWare = async (req, _, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    req.token = token;
    return next();
};

export const attachUser: MiddleWare = async (req, res, next) => {
    if (!req.token) {
        res.status(401).json({ message: 'Authentication error' });
        next(Error('Authentication error'));
        return;
    }
    const decodedToken = jwt.verify(req.token, JWT_SECRET as string) as TokenPayload;
    const user = await User.findById(decodedToken.id);
    if (user != null) {
        req.user = user;
    } else {
        res.status(404).json({ message: 'User not found' });
    }
    next();
};

export const validateAdmin: MiddleWare = async (req, res, next) => {
    const user = req.user as IUser;
    const league = await League.findById(req.params.leagueId);

    if (!user) {
        res.status(401).json({ error: 'could not find user' });
        return;
    }
    if (!league) {
        res.status(404).json({ message: 'league not found' });
        return;
    }

    const isAdmin = league.admins.find((admin) => admin.userId.equals(user.id)) != null;

    req.isAdmin = isAdmin;
    req.league = league;
    next();
};