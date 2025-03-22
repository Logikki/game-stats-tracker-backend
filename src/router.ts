import { createGame, getGames } from './controllers/games';
import { acceptLeagueInvitation, createLeagueInvitation } from './controllers/invitation';
import { createLeague, deleteGame, deleteLeague, putUserToLeague } from './controllers/leagues';
import { login } from './controllers/login';
import { createUser, getUser, getUsers } from './controllers/users';
import {
    attachUser,
    validateAdmin,
    validateLeagueInvitation,
    validateToken
} from './utils/middleware';
import { Router } from 'express';

const router = Router();

router.post('/login', login);
router.post('/game', createGame);
router.post('/league', createLeague);
router.post('/user', createUser);
router.post('/league/user/:leagueId/', validateToken, attachUser, validateAdmin, putUserToLeague);
router.post(
    '/league/invite/:leagueId/',
    validateToken,
    attachUser,
    validateAdmin,
    createLeagueInvitation
);
router.post(
    '/league/join/:invitationCode/',
    validateToken,
    attachUser,
    validateLeagueInvitation,
    acceptLeagueInvitation
);

router.get('/user', validateToken, attachUser, getUser);
// for testing
router.get('/game', getGames);
router.get('/users', getUsers);

router.delete(
    '/league/remove-game/:leagueId/:gameId',
    validateToken,
    attachUser,
    validateAdmin,
    deleteGame
);
router.delete('/league/delete/:leagueId/', validateToken, attachUser, validateAdmin, deleteLeague);

export default router;
