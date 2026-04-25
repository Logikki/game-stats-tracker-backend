import mongoose, { Schema, Document, Types } from 'mongoose';
import { GameType } from '../../common/enums/GameType';

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
    users: [{ type: Types.ObjectId, ref: 'User', required: false, _id: false }],
    admins: [{ type: Types.ObjectId, ref: 'User', required: true, _id: false }],
    matches: [{ type: Types.ObjectId, required: false, ref: 'BaseGame', _id: false }],
    duration: { type: Date, required: true }
});

LeagueSchema.set('toJSON', {
    transform: (document, returnedObject: Record<string, any>) => {
        if (returnedObject._id) {
            returnedObject.id = returnedObject._id.toString();
            delete returnedObject._id;
        }
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

const League = mongoose.model<ILeague>('League', LeagueSchema);

export { ILeague, League };
