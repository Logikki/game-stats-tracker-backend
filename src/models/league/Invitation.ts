import mongoose, { Schema, Document, Types } from 'mongoose';

interface IInvitation extends Document {
    code: string;
    league: Types.ObjectId;
    invitedBy: Types.ObjectId;
    expiresAt: Date;
    used: boolean;
}

const invitationSchema = new Schema<IInvitation>({
    code: { type: String, required: true, unique: true },
    league: { type: Schema.Types.ObjectId, ref: 'League', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
});

const Invitation = mongoose.model<IInvitation>('Invitation', invitationSchema);

export { Invitation, IInvitation };
