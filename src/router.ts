import { createGame, getGames, deleteGame } from './controllers/games';
import { acceptLeagueInvitation, createLeagueInvitation } from './controllers/invitation';
import { createLeague, deleteLeague, putUserToLeague } from './controllers/leagues';
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
    validateToken,
    validateUserIsPartOfGame
} from './utils/middleware';
import { Router } from 'express';

const router = Router();

// League routes
router.post('/league', createLeague);
router.post('/league/user/:leagueId/', validateToken, attachUser, validateAdmin, putUserToLeague);
router.delete('/league/delete/:leagueId', validateToken, attachUser, validateAdmin, deleteLeague);
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

// login route
router.post('/login', login);

// user routes
router.post('/user', createUser);
router.post('/user/visibility', validateToken, attachUser, updateUserVisibility);
router.get('/user/own', validateToken, attachUser, getOwnUser);
router.get('/user/:username', validateToken, attachUser, getUser);

// friend request routes
router.post('/user/friend-request/:username', validateToken, attachUser, sendFriendRequest);
router.post(
    '/user/friend-request/accept/:username',
    validateToken,
    attachUser,
    acceptFriendRequest
);
router.delete(
    '/user/friend-request/reject/:username',
    validateToken,
    attachUser,
    rejectFriendRequest
);
router.delete('/user/friend/:username', validateToken, attachUser, removeFriend);

// game routes
router.post('/game', createGame);
router.delete(
    '/game/remove/:gameId',
    validateToken,
    attachUser,
    validateUserIsPartOfGame,
    deleteGame
);

// for testing
router.get('/game', getGames);
router.get('/users', getUsers);

export default router;
