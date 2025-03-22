import { MiddleWare } from 'src/interfaces/express';
import { IInvitation, Invitation } from '../models/Invitation';
import { v4 as uuidv4 } from 'uuid';
import { League } from '../models/league/League';

export const createLeagueInvitation: MiddleWare = async (req, res, next) => {
    const league = req.league;
    const invitedBy = req.user;

    if (!league || !invitedBy) {
        res.status(404).json({ message: 'Missing required fields' });
        return;
    }

    const invitationCode = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = new Invitation({
        code: invitationCode,
        league: league.id,
        invitedBy,
        expiresAt,
        used: false
    });

    await invitation.save();

    res.status(201).json({ code: invitationCode });
};

export const acceptLeagueInvitation: MiddleWare = async (req, res, next) => {
    const user = req.user;
    const league = req.league;

    if (!user || !league) {
        res.status(404).json({ message: 'Invalid invitation' });
        return;
    }

    console.log(
        'invitation is valid and user is not a member of the league, adding them to the league'
    );

    league.users.push(user.id);
    user.leagues.push(league.id);
    await league.save();
    await user.save();

    const response = await League.find({ league }).populate;
    res.status(200).json(league);
};
