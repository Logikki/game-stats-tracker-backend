import mongoose, { Schema, Document, Types } from 'mongoose';
import { ProfileVisibility } from '../../common/enums/ProfileVisibility';

interface IUser extends Document {
    username: string;
    name: string;
    email: string;
    profileVisibility: ProfileVisibility;
    passwordHash: string;
    matches: Types.ObjectId[];
    leagues: Types.ObjectId[];
    friends: Types.ObjectId[];
    friendRequests: Types.ObjectId[];
    isVisibleTo(ownUser: IUser): boolean;
}

const UserSchema: Schema = new Schema<IUser>({
    username: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    passwordHash: { type: String, required: true },
    profileVisibility: {
        type: String,
        enum: ProfileVisibility,
        default: ProfileVisibility.Private
    },
    friends: [
        {
            type: Types.ObjectId,
            required: false,
            ref: 'User',
            default: []
        }
    ],
    matches: [
        {
            type: Types.ObjectId,
            required: false,
            ref: 'BaseGame',
            default: []
        }
    ],
    leagues: [
        {
            type: Types.ObjectId,
            required: false,
            ref: 'League',
            default: []
        }
    ],
    friendRequests: [{ type: Types.ObjectId, ref: 'User', default: [] }]
});

UserSchema.methods.isVisibleTo = function(this: IUser, ownUser: IUser): boolean {
    const userToGet = this;

    if (ownUser.id.toString() == userToGet.id.toString()) {
        return true;
    }

    switch (userToGet.profileVisibility) {
        case ProfileVisibility.Public:
            return true;
        case ProfileVisibility.Private:
            return false;
        case ProfileVisibility.Friends:
            const isOwnUserFriendOfUserToGet = userToGet.friends.some(
                (friendId: Types.ObjectId) => friendId.equals(ownUser.id)
            );
            const isUserToGetFriendOfOwnUser = ownUser.friends.some(
                (friendId: Types.ObjectId) => friendId.equals(userToGet.id)
            );
            return isOwnUserFriendOfUserToGet && isUserToGetFriendOfOwnUser;
        default:
            return false;
    }
};

UserSchema.set('toJSON', {
    transform: (document, returnedObject: Record<string, any>) => {
        if (returnedObject._id) {
            returnedObject.id = returnedObject._id.toString();
            delete returnedObject._id;
        }
        delete returnedObject.__v;
        delete returnedObject.passwordHash;
    }
});

const User = mongoose.model<IUser>('User', UserSchema);

export { User, IUser, UserSchema };
