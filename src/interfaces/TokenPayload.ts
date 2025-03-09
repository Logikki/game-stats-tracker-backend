import { Types } from "mongoose";

export interface TokenPayload {
    username: string;
    name: string;
    id: string;
    matches: { matchId: Types.ObjectId }[];
    leagues: { leagueId: Types.ObjectId }[];
}
