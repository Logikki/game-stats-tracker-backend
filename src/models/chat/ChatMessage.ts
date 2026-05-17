import mongoose, { Schema, Document, Types } from 'mongoose';

interface IEncryptedKey {
    recipient: Types.ObjectId;
    encryptedMEK: string;
    ephemeralPublicKey: string;
}

interface IChatMessage extends Document {
    league: Types.ObjectId;
    sender: Types.ObjectId;
    ciphertext: string;
    nonce: string;
    encryptedKeys: IEncryptedKey[];
    encryptedImage?: Buffer;
    imageMimeType?: string;
    imageNonce?: string;
    encryptedImageKeys?: IEncryptedKey[];
    createdAt: Date;
}

const EncryptedKeySchema = new Schema<IEncryptedKey>(
    {
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        encryptedMEK: { type: String, required: true },
        ephemeralPublicKey: { type: String, required: true }
    },
    { _id: false }
);

const ChatMessageSchema = new Schema<IChatMessage>(
    {
        league: { type: Schema.Types.ObjectId, ref: 'League', required: true, index: true },
        sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        ciphertext: { type: String, required: true },
        nonce: { type: String, required: true },
        encryptedKeys: { type: [EncryptedKeySchema], required: true },
        encryptedImage: { type: Buffer, required: false },
        imageMimeType: { type: String, required: false },
        imageNonce: { type: String, required: false },
        encryptedImageKeys: { type: [EncryptedKeySchema], required: false }
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

ChatMessageSchema.index({ createdAt: -1 });

ChatMessageSchema.set('toJSON', {
    transform: (_, returnedObject: Record<string, any>) => {
        if (returnedObject._id) {
            returnedObject.id = returnedObject._id.toString();
            delete returnedObject._id;
        }
        delete returnedObject.__v;
        delete returnedObject.encryptedImage;
    }
});

const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

export { ChatMessage, IChatMessage };
