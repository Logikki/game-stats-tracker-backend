import mongoose, { Schema, Document, Types } from 'mongoose';

interface IInvitation extends Document {
    code: string;
    league: Types.ObjectId;
    invitedBy: Types.ObjectId;
    expiresAt: Date;
    used: boolean;
}

const InvitationSchema = new Schema<IInvitation>({
    code: { type: String, required: true, unique: true },
    league: { type: Schema.Types.ObjectId, ref: 'League', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
});

const Invitation = mongoose.model<IInvitation>('Invitation', InvitationSchema);

InvitationSchema.set('toJSON', {
    transform: (document, returnedObject: Record<string, any>) => {
        if (returnedObject._id) {
            returnedObject.id = returnedObject._id.toString();
            delete returnedObject._id;
        }
        delete returnedObject._id;
        delete returnedObject.__v;
    }
});

export { Invitation, IInvitation };
