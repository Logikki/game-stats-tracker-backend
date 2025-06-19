import { ILeague, League } from "src/models/league/League";
import { IUser } from "src/models/User/User";

export const populateLeague = async (league: ILeague): Promise<ILeague> => {
    return league.populate([
        {
            path: 'users',
            model: 'User',
            select: 'id username profileVisibility'
        },
        {
            path: 'admins',
            model: 'User',
            select: 'id username profileVisibility'
        },
        {
            path: 'matches',
            model: 'BaseGame',
            select: 'id gameType homeTeam awayTeam homeScore awayScore overTime penalties createdAt updatedAt',
            populate: [
                {
                    path: 'homePlayer',
                    model: 'User',
                    select: 'id username profileVisibility'
                },
                {
                    path: 'awayPlayer',
                    model: 'User',
                    select: 'id username profileVisibility'
                }
            ]
        }
    ]);
};

export const populateUser = async (user: IUser): Promise<IUser> => {
    const populatedUser = await user.populate([
        {
            path: 'leagues',
            model: 'League',
            populate: [
                {
                    path: 'users',
                    model: 'User',
                    select: 'id username profileVisibility'
                },
                {
                    path: 'admins',
                    model: 'User',
                    select: 'id username profileVisibility'
                },
                {
                    path: 'matches',
                    model: 'BaseGame',
                    select: 'id gameType homeTeam awayTeam homeScore awayScore overTime penalties createdAt updatedAt',
                    populate: [
                        {
                            path: 'homePlayer',
                            model: 'User',
                            select: 'id username profileVisibility'
                        },
                        {
                            path: 'awayPlayer',
                            model: 'User',
                            select: 'id username profileVisibility'
                        }
                    ]
                }
            ]
        },
        {
            path: 'matches',
            model: 'BaseGame',
            select: 'id gameType homeTeam awayTeam homeScore awayScore overTime penalties createdAt updatedAt',
            populate: [
                {
                    path: 'homePlayer',
                    model: 'User',
                    select: 'id username profileVisibility'
                },
                {
                    path: 'awayPlayer',
                    model: 'User',
                    select: 'id username profileVisibility'
                }
            ]
        },
        {
            path: 'friends',
            model: 'User',
            select: 'id username profileVisibility'
        },
        {
            path: 'friendRequests',
            model: 'User',
            select: 'id username profileVisibility'
        }
    ]);

    return populatedUser;
};