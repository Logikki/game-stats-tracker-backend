import mongoose, { Schema, Document, Model, Types } from 'mongoose';

interface IUser extends Document {
    username: string;
    name: string;
    email: string;
    passwordHash: string;
    matches: { matchId: Types.ObjectId }[];
    leagues: { leagueId: Types.ObjectId }[];
}

const userSchema: Schema = new Schema<IUser>({
    username: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    matches: [
        {
            matchId: { type: Schema.Types.ObjectId, required: false, ref: 'BaseGame', _id: false }
        }
    ],
    leagues: [
        {
            leagueId: { type: Schema.Types.ObjectId, required: false, ref: 'League', _id: false }
        }
    ]
});

userSchema.set('toJSON', {
    transform: (document, returnedObject: Record<string, any>) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
        delete returnedObject.passwordHash;
    }
});

const User = mongoose.model<IUser>('User', userSchema);

export { User, IUser };
