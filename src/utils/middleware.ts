import jwt from 'jsonwebtoken';
import { User } from '../models/common/User';
import { MiddleWare, TokenPayload } from '../common/interfaces/express';
import { JWT_SECRET } from './config';
import { League } from '../models/league/League';
import { Invitation } from '../models/Invitation';

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

    const isAdmin = league.admins.find((admin) => admin.toString().includes(user.id)) != null;

    if (!isAdmin) {
        res.status(403).json({ message: 'Authentication error' });
        return;
    }

    req.isAdmin = isAdmin;
    req.league = league;
    next();
};

export const validateLeagueInvitation: MiddleWare = async (req, res, next) => {
    const user = req.user;
    const code = req.params.invitationCode;
    const invitation = await Invitation.findOne({ code });

    if (!invitation || invitation?.used) {
        console.log('invalid invitation or invitation is already used');
        return res.status(403).json({ message: 'league not found' });
    }
    invitation.used = true;
    await invitation.save();

    const league = await League.findById(invitation.league._id);

    if (!league) {
        console.log('invitation is corrupt');
        return res.status(404).json({ message: 'corrupt invitation' });
    }

    if (!user) {
        return res.status(401).json({ error: 'could not find user' });
    }

    if (league.users.includes(user.id)) {
        return res.status(400).json({ message: 'user is already a member of this league' });
    }

    if (new Date() > invitation.expiresAt) {
        return res.status(403).json({ message: 'invitation is expired' });
    }

    req.league = league;
    next();
};
