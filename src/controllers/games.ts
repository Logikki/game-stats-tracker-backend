import { Request, Response } from 'express';
import { User } from '../models/User/User';
import { League } from '../models/league/League';
import { GameType } from '../common/enums/GameType';
import { BaseGame } from '../models/Games/BaseGame';

export const createGame = async (req: Request, res: Response) => {
    const {
        homeTeam,
        awayTeam,
        homePlayer,
        awayPlayer,
        homeScore,
        awayScore,
        createdAt,
        overTime,
        penalties,
        league,
        gameType
    } = req.body;
    const userHomePlayer = await User.findOne({ username: homePlayer });
    const userAwayPlayer = await User.findOne({ username: awayPlayer });
    const leagueItem = await League.findOne({ _id: league });

    if (
        !homeTeam ||
        !awayTeam ||
        !homePlayer ||
        !awayPlayer ||
        !createdAt ||
        !homeScore ||
        !awayScore ||
        !gameType
    ) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    if (!userHomePlayer || !userAwayPlayer) {
        res.status(404).json({ error: 'Could not resolve players by username' });
        return;
    }

    if (!Object.values(GameType).includes(gameType)) {
        res.status(400).json({ error: 'Invalid game type' });
    }

    //TODO: create own request for league games?
    if (leagueItem) {
        const isHomePlayerInLeague = leagueItem.users.some((user) =>
            user.equals(userHomePlayer.id)
        );
        const isAwayPlayerInLeague = leagueItem.users.some((user) =>
            user.equals(userAwayPlayer.id)
        );
        if (!isHomePlayerInLeague || !isAwayPlayerInLeague) {
            res.status(400).json({ error: 'User is not in the league' });
            return;
        }
    }

    const game = new BaseGame({
        gameType: gameType,
        league: league,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        homePlayer: userHomePlayer.id,
        awayPlayer: userAwayPlayer.id,
        homeScore: homeScore,
        awayScore: awayScore,
        createdAt: createdAt,
        overTime: overTime,
        penalties: penalties
    });

    await game.save();
    await userHomePlayer.updateOne({ $push: { matches: game } });
    await userAwayPlayer.updateOne({ $push: { matches: game } });
    if (leagueItem != null) {
        console.log('Adding game to league');
        await leagueItem.updateOne({
            $push: { matches: game.id }
        });
    }

    res.status(201).json(game);
};

export const getGames = async (_req: Request, res: Response) => {
    const games = await BaseGame.find()
        .populate({ path: 'homePlayer', select: 'name' })
        .populate({ path: 'awayPlayer', select: 'name' });
    res.json(games);
};
