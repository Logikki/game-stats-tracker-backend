import { userSchema } from 'src/models/User/User';

userSchema.methods.gameCount = function (): number {
    return this.matches.length;
};
