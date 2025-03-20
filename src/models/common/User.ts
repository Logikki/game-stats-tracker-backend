import mongoose, { Schema, Document, Types } from 'mongoose';

interface IUser extends Document {
    username: string;
    name: string;
    email: string;
    passwordHash: string;
    matches: Types.ObjectId[];
    leagues: Types.ObjectId[];
}

const userSchema: Schema = new Schema<IUser>({
    username: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    matches: [
        {
            type: Types.ObjectId, required: false, ref: 'BaseGame'
        }
    ],
    leagues: [
        {
            type: Types.ObjectId, required: false, ref: 'League'
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
