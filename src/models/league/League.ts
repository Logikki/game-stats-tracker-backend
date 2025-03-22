import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { GameType } from '../../interfaces/GameType';

interface ILeague extends Document {
    name: string;
    description: string;
    gameTypes: GameType[];
    users: Types.ObjectId[];
    admins: Types.ObjectId[];
    matches: Types.ObjectId[];
    duration: Date;
}

const LeagueSchema: Schema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: false },
    gameTypes: [{ type: String, enum: Object.values(GameType), required: true }],
    users: [{ type: Schema.Types.ObjectId, ref: 'User', required: false, _id: false }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'User', required: true, _id: false }],
    matches: [{ type: Schema.Types.ObjectId, required: false, ref: 'BaseGame', _id: false }],
    duration: { type: Date, required: true }
});

const League: Model<ILeague> = mongoose.model<ILeague>('League', LeagueSchema);

export { ILeague, League };
