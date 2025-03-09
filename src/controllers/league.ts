import express, { Request, Response } from 'express';
import { League } from '@models/league/League';
import { User, IUser } from '@models/common/User';
import { Types } from 'mongoose';
import { CustomRequest } from '@utils/middleware';
import { BaseGame } from '@models/common/BaseGame';

export const createLeague = async (req: Request, res: Response) => {
    const userIds = await resolveUsers(req.body.users);
    const admins = await resolveUsers(req.body.admins);

    if (!req.body.name || !req.body.duration || !req.body.gameTypes) {
        res.status(401).json({ message: 'Missing required fields' });
        return;
    }

    const league = new League({
        users: userIds,
        admins: admins,
        description: req.body.description,
        name: req.body.name,
        duration: req.body.duration,
        gameTypes: req.body.gameTypes
    });

    console.log(league);
    await league.save();
    res.status(201).json(league);
};

export const putUserToLeague =  async (req: Request, res: Response) => {
    const { leagueId } = req.params;
    const { username } = req.body;

    const user = await User.findOne({ username: username }).lean();

    if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
    }

    const league = await League.findById(leagueId);
    if (!league) {
        res.status(401).json({ message: 'League not found' });
        return;
    }

    league.users.push({ userId: user._id as Types.ObjectId });
    await league.save();

    res.status(200).json(league);
};

export const deleteGame = async (req: CustomRequest, res: Response) => {
    const { leagueId, gameId } = req.params;
    const league = await League.findById(leagueId);
    const user = req.user as IUser;
    const token = req.token;

    if (!token || !user) {
        res.status(401).json({ error: 'invalid authorization' });
        return;
    }
    if (!league) {
        res.status(404).json({ message: 'league not found' });
        return;
    }

    const isAdmin = league.admins.find((admin) => admin.userId.equals(user.id)) != null;

    if (isAdmin) {
        console.log('LeagueRouter: Correct credentials, removing the game from league');
        league.matches.map((match) => console.log(match, match.matchType));
        const matches = league.matches.filter((match) => !match.matchId.equals(gameId));
        league.matches = matches;
        // there can be only one
        await BaseGame.findByIdAndDelete(matches[0]);
        await league.save();
        res.status(204).end();
    } else {
        res.status(401).json({ message: 'User unauthorized to delete matches from this league' });
    }
};

export const deleteLeague = async (req: CustomRequest, res: Response) => {
    const leagueId = req.params.leagueId;
    const league = await League.findById(leagueId);
    const user = req.user as IUser;
    const token = req.token;

    if (!token || !user) {
        res.status(401).json({ error: 'invalid authorization' });
        return;
    }
    if (!league) {
        res.status(404).json({ message: 'league not found' });
        return;
    }

    const isAdmin = league.admins.find((admin) => admin.userId.equals(user.id)) != null;

    if (isAdmin) {
        console.log('LeagueRouter: Correct credentials, removing league');
        await League.findByIdAndDelete(leagueId);
        res.status(204).end();
    } else {
        res.status(401).json({ message: 'User unauthorized to delete the league' });
    }
};

const resolveUsers = async (usernames: string[]): Promise<{ userId: Types.ObjectId }[]> => {
    const users = await User.find({ username: { $in: usernames } }).lean();
    return users.map((user) => ({ userId: user._id as Types.ObjectId }));
};
