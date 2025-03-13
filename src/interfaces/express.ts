import { Types } from 'mongoose';
import { Request as ExpressRequest, NextFunction, Response } from 'express';
import { IUser } from '../models/common/User';
import { ILeague } from '../models/league/League';

export interface TokenPayload {
    username: string;
    name: string;
    id: string;
    matches: { matchId: Types.ObjectId }[];
    leagues: { leagueId: Types.ObjectId }[];
}

export interface TrackerApiRequest extends ExpressRequest {
    user?: IUser | null;
    token?: string;
    isAdmin?: boolean;
    league?: ILeague;
}

export interface MiddleWare {
    (req: TrackerApiRequest, res: Response, next: NextFunction): void;
}
