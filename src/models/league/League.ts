import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { GameType } from '../../interfaces/GameType';
import { LeagueMatch } from '../../interfaces/LeagueMatch';

interface ILeague extends Document {
    name: string;
    description: string;
    gameTypes: GameType[];
    users: { userId: Types.ObjectId }[];
    admins: { userId: Types.ObjectId }[];
    matches: LeagueMatch[];
    duration: Date;
}

const LeagueSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: false },
    gameTypes: [{ type: String, enum: Object.values(GameType), required: true }],
    users: [{ userId: { type: Schema.Types.ObjectId, ref: 'User', required: false }, _id: false }],
    admins: [{ userId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, _id: false }],
    matches: [
        {
            matchId: { type: Schema.Types.ObjectId, required: false, ref: 'BaseGame' },
            matchType: { type: String, required: false },
            _id: false
        }
    ],
    duration: { type: Date, required: true }
});

const League: Model<ILeague> = mongoose.model<ILeague>('League', LeagueSchema);

export { ILeague, League };
