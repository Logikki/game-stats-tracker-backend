import { GameType } from '../../interfaces/GameType';
import mongoose, { Schema, Document, Types } from 'mongoose';

interface IBaseGame extends Document {
    league: Schema.Types.ObjectId;
    gameType: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    homePlayer: Schema.Types.ObjectId;
    awayPlayer: Schema.Types.ObjectId;
    overTime: Boolean;
    penalties: Boolean;
    createdAt: Date;
    updatedAt?: Date;
}

const BaseGameSchema = new Schema<IBaseGame>(
    {
        gameType: { type: String, enum: GameType, required: true },
        league: { type: Types.ObjectId, ref: 'League', required: false },
        homeTeam: { type: String, required: true },
        awayTeam: { type: String, required: true },
        homeScore: { type: Number, require: true },
        awayScore: { type: Number, require: true },
        homePlayer: { type: Types.ObjectId, ref: 'User', required: true },
        awayPlayer: { type: Types.ObjectId, ref: 'User', required: true },
        overTime: { type: Boolean, required: false, default: null },
        penalties: { type: Boolean, required: false, default: null },
        createdAt: { type: Date, required: true }
    },
    { discriminatorKey: 'gameType' }
);

const BaseGame = mongoose.model<IBaseGame>('BaseGame', BaseGameSchema);

export { IBaseGame, BaseGame };
