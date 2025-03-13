import jwt from 'jsonwebtoken';
import { IUser, User } from '../models/common/User';
import { MiddleWare, TokenPayload } from '../interfaces/express';
import { JWT_SECRET } from './config';
import { League } from '../models/league/League';

export const validateToken: MiddleWare = async (req, _, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    req.token = token;
    return next();
};

export const attachUser: MiddleWare = async (req, res, next) => {
    try {
        if (!req.token) {
            res.status(403).json({ message: 'Authentication error' });
            return next(Error('Authentication error'));
        }
        const decodedToken = jwt.verify(req.token, JWT_SECRET as string) as TokenPayload;
        const user = await User.findById(decodedToken.id);
        req.user = user;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Authentication error' });
    }
};

export const validateAdmin: MiddleWare = async (req, res, next) => {
    const user = req.user;
    const league = await League.findById(req.params.leagueId);

    if (!user) {
        res.status(401).json({ error: 'could not find user' });
        return;
    }
    if (!league) {
        console.log('league not found', league);
        res.status(404).json({ message: 'league not found' });
        return;
    }

    const isAdmin = league.admins.find((admin) => admin.userId.equals(user.id)) != null;

    if (!isAdmin) {
        res.status(403).json({ message: 'Authentication error' });
        return;
    }

    req.isAdmin = isAdmin;
    req.league = league;
    next();
};
