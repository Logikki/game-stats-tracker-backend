import { GameType } from '../../interfaces/GameType';
import mongoose, { Schema, Document, Types } from 'mongoose';

interface IBaseGame extends Document {
    league: Types.ObjectId;
    gameType: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    homePlayer: Types.ObjectId;
    awayPlayer: Types.ObjectId;
    overTime: Boolean;
    penalties: Boolean;
    createdAt: Date;
    updatedAt?: Date;
}

const BaseGameSchema = new Schema<IBaseGame>(
    {
        gameType: { type: String, enum: GameType, required: true },
        league: { type: Schema.Types.ObjectId, ref: 'League', required: false },
        homeTeam: { type: String, required: true },
        awayTeam: { type: String, required: true },
        homeScore: { type: Number, require: true },
        awayScore: { type: Number, require: true },
        homePlayer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        awayPlayer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        overTime: { type: Boolean, required: false, default: null },
        penalties: { type: Boolean, required: false, default: null },
        createdAt: { type: Date, required: true }
    },
    { discriminatorKey: 'gameType' }
);

const BaseGame = mongoose.model<IBaseGame>('BaseGame', BaseGameSchema);

export { IBaseGame, BaseGame };
