import { Request, Response } from 'express';
import { IUser, User } from '../models/User/User';
import { ILeague, League } from '../models/league/League';
import { GameType } from '../common/enums/GameType';
import { BaseGame } from '../models/Games/BaseGame';
import { MiddleWare } from 'src/common/interfaces/express';

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
        homeScore == null ||
        awayScore == null ||
        !gameType
    ) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    if (!userHomePlayer || !userAwayPlayer) {
        res.status(404).json({ error: 'Could not resolve players by username' });
        return;
    }

    if (league && !leagueItem) {
        res.status(404).json({ error: 'This league no longer exists' });
        return;
    }

    if (!Object.values(GameType).includes(gameType)) {
        res.status(400).json({ error: 'Invalid game type' });
    }

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

    if (leagueItem) {
        console.log('Adding game to league');
        await leagueItem.updateOne({
            $push: { matches: game.id }
        });
    }

    await game.populate([
        { path: 'homePlayer', select: 'username profileVisibility' },
        { path: 'awayPlayer', select: 'username profileVisibility' }
    ]);

    res.status(201).json(game);
};

export const getGames = async (_req: Request, res: Response) => {
    // Note: You may want to add 'profileVisibility' here too so the GET endpoint matches your POST structure exactly
    const games = await BaseGame.find()
        .populate({ path: 'homePlayer', select: 'username profileVisibility' })
        .populate({ path: 'awayPlayer', select: 'username profileVisibility' });
    res.json(games);
};

export const deleteGame: MiddleWare = async (req, res, _) => {
    const gameId = req.params.gameId;
    const matchItem = await BaseGame.findById(gameId);

    if (!matchItem) {
        res.status(404).json({ message: 'Cant find given game' });
        return;
    }

    console.log('LeagueRouter: Correct credentials, removing the game from league');

    const awayPlayer = (await User.findById(matchItem.awayPlayer)) as IUser;
    const homePlayer = (await User.findById(matchItem.homePlayer)) as IUser;
    const league = (await League.findById(matchItem.league)) as ILeague;

    awayPlayer.matches = awayPlayer!.matches.filter(
        (match) => !match.toString().includes(matchItem.id)
    );
    homePlayer.matches = homePlayer!.matches.filter(
        (match) => !match.toString().includes(matchItem.id)
    );

    if (league) {
        await deleteGameFromLeague(matchItem.id, league);
    }

    await homePlayer?.save();
    await awayPlayer?.save();
    await BaseGame.findByIdAndDelete(matchItem.id);

    res.status(204).end();
};

const deleteGameFromLeague = async (match: string, league: ILeague) => {
    console.log('delete game from league');
    const matches = league.matches.filter((mId) => !mId.toString().includes(match));
    league.matches = matches;
    await league.save();
};
