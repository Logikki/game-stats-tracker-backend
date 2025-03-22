import { Request, Response } from 'express';
import { League } from '../models/league/League';
import { User, IUser } from '../models/common/User';
import { Types } from 'mongoose';
import { BaseGame } from '../models/common/BaseGame';
import { MiddleWare } from '../interfaces/express';

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
    const user = await User.findOne({ username: username });

    if (!league || !user) {
        res.status(404).json({ message: 'Missing required fields' });
        return;
    }

    user.leagues.push(league.id);
    await user.save();

    league.users.push(user.id);
    await league.save();

    res.status(200).json(league);
};

export const deleteGame: MiddleWare = async (req, res, next) => {
    const gameId = req.params.gameId;
    const league = req.league;
    const matchItem = await BaseGame.findById(gameId);

    if (!league || !matchItem) {
        res.status(404).json({ message: 'Missing required fields' });
        return;
    }

    console.log('LeagueRouter: Correct credentials, removing the game from league');

    const awayPlayer = (await User.findById(matchItem.awayPlayer)) as IUser;
    const homePlayer = (await User.findById(matchItem.homePlayer)) as IUser;
    awayPlayer.matches = awayPlayer!.matches.filter(
        (match) => !match.toString().includes(matchItem.id)
    );
    homePlayer.matches = homePlayer!.matches.filter(
        (match) => !match.toString().includes(matchItem.id)
    );

    const matches = league.matches.filter((mId) => !mId.toString().includes(gameId));
    league.matches = matches;

    await homePlayer?.save();
    await awayPlayer?.save();
    await league.save();

    await BaseGame.findByIdAndDelete(matchItem.id);

    res.status(204).end();
};

export const deleteLeague: MiddleWare = async (req, res, next) => {
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
