import { UserSchema } from 'src/models/User/User';

UserSchema.methods.gameCount = function (): number {
    return this.matches.length;
};
