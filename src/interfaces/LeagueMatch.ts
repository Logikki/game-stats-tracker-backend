import { Types } from 'mongoose';
import { GameType } from './GameType';

export interface LeagueMatch {
    matchId: Types.ObjectId;
    matchType: GameType;
}
