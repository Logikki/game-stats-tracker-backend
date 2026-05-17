import mongoose, { Schema, Document, Types } from 'mongoose';

interface IUserPublicKey extends Document {
    user: Types.ObjectId;
    publicKey: string;
    algorithm: string;
    createdAt: Date;
}

const UserPublicKeySchema = new Schema<IUserPublicKey>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
        publicKey: { type: String, required: true },
        algorithm: { type: String, required: true, default: 'x25519' }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

UserPublicKeySchema.set('toJSON', {
    transform: (_, returnedObject: Record<string, any>) => {
        if (returnedObject._id) {
            returnedObject.id = returnedObject._id.toString();
            delete returnedObject._id;
        }
        delete returnedObject.__v;
    }
});

const UserPublicKey = mongoose.model<IUserPublicKey>('UserPublicKey', UserPublicKeySchema);

export { UserPublicKey, IUserPublicKey };
