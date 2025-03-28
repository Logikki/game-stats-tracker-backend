import { createGame, getGames } from './controllers/games';
import { acceptLeagueInvitation, createLeagueInvitation } from './controllers/invitation';
import { createLeague, deleteGame, deleteLeague, putUserToLeague } from './controllers/leagues';
import { login } from './controllers/login';
import {
    acceptFriendRequest,
    createUser,
    getOwnUser,
    getUser,
    getUsers,
    rejectFriendRequest,
    removeFriend,
    sendFriendRequest,
    updateUserVisibility
} from './controllers/users';
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
router.post('/user/visibility', validateToken, attachUser, updateUserVisibility);

router.post('/user/friend-request/:friendId', validateToken, attachUser, sendFriendRequest);
router.post(
    '/user/friend-request/accept/:friendId',
    validateToken,
    attachUser,
    acceptFriendRequest
);
router.delete(
    '/user/friend-request/reject/:friendId',
    validateToken,
    attachUser,
    rejectFriendRequest
);
router.delete('/user/friend/:friendId', validateToken, attachUser, removeFriend);

router.get('/user/own', validateToken, attachUser, getOwnUser);
router.get('/user/:username', validateToken, attachUser, getUser);
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
router.delete('/league/delete/:leagueId', validateToken, attachUser, validateAdmin, deleteLeague);

export default router;
