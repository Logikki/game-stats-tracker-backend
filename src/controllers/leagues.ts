import { Request, Response } from 'express';
import { ILeague, League } from '../models/league/League';
import { User, IUser } from '../models/User/User';
import { Types } from 'mongoose';
import { MiddleWare } from '../common/interfaces/express';
import { populateLeague } from '../common/populate';

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

    userIds.map(async (id) => {
        await User.findByIdAndUpdate(id, { $push: { leagues: league._id } });
    });

    await league.save();
    res.status(201).json(league);
};

export const putUserToLeague: MiddleWare = async (req, res, next) => {
    const { username } = req.body;
    const league = req.league;
    const userToAdd = await User.findOne({ username: username });

    if (!league || !userToAdd) {
        res.status(404).json({ message: 'Missing required fields' });
        return;
    }

    userToAdd.leagues.push(league.id);
    await userToAdd.save();

    league.users.push(userToAdd.id);
    await league.save();

    const response = await populateLeague(league);
    res.status(200).json(response);
};

export const deleteLeague: MiddleWare = async (req, res, _) => {
    const league = req.league;

    if (!league) {
        res.status(404).json({ message: 'League not found' });
        return;
    }

    console.log('LeagueRouter: Correct credentials, removing league');
    await League.findByIdAndDelete(league.id);
    res.status(204).end();
};

const resolveUsers = async (usernames: string[]): Promise<Types.ObjectId[]> => {
    const users = await User.find({ username: { $in: usernames } }).lean();
    return users.map((user) => user._id as Types.ObjectId);
};
