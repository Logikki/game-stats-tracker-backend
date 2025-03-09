import { Request, Response } from 'express';
import { User } from '@models/common/User';
import { League } from '@models/league/League';
import { GameType } from '@interfaces/GameType';
import { BaseGame } from '@models/common/BaseGame';

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
        homeScore === undefined ||
        awayScore === undefined ||
        !gameType
    ) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    if (userHomePlayer === null || userAwayPlayer === null) {
        res.status(404).json({ error: 'Could not resolve players by username' });
        return;
    }

    if (!Object.values(GameType).includes(gameType)) {
        res.status(400).json({ error: 'Invalid game type' });
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
        await leagueItem.updateOne({ $push: { matches: { matchId: game.id, matchType: GameType.NHL } } });
    }

    res.status(201).json(game);
}

export const getGames = async (_req: Request, res: Response) => {
    const games = await BaseGame.find().populate('homePlayer awayPlayer');
    res.json(games);
};
