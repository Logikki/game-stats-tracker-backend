import { Request as ExpressRequest, NextFunction, Response } from 'express';
import { IUser } from '../../models/User/User';
import { ILeague } from '../../models/league/League';
import { IBaseGame } from '../../models/Games/BaseGame';

export interface TokenPayload {
    username: string;
    name: string;
    id: string;
}

export interface TrackerApiRequest extends ExpressRequest {
    user?: IUser | null;
    token?: string;
    isAdmin?: boolean;
    league?: ILeague;
    game?: IBaseGame;
}

export interface MiddleWare {
    (req: TrackerApiRequest, res: Response, next: NextFunction): void;
}
