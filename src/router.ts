import { createGame, getGames, deleteGame } from './controllers/games';
import { acceptLeagueInvitation, createLeagueInvitation } from './controllers/invitation';
import { createLeague, deleteLeague, putUserToLeague } from './controllers/leagues';
import { login } from './controllers/login';
import { getAvatar, uploadAvatar, deleteAvatar } from './controllers/avatar';
import {
    registerPublicKey,
    getLeaguePublicKeys,
    getMessages,
    sendMessage,
    deleteMessage,
    getMessageImage
} from './controllers/chat';
import multer from 'multer';
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
    validateLeagueMembership,
    validateToken,
    validateUserIsPartOfGame
} from './utils/middleware';
import { Router } from 'express';

const router = Router();

const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

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

// avatar routes (GET is public; POST/DELETE require auth)
router.get('/user/:username/avatar', getAvatar);
router.post('/user/avatar', validateToken, attachUser, avatarUpload.single('avatar'), uploadAvatar);
router.delete('/user/avatar', validateToken, attachUser, deleteAvatar);

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

// chat routes — /chat/keys must come before /chat/:leagueId
const chatUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

router.post('/chat/keys', validateToken, attachUser, registerPublicKey);
router.get('/chat/keys/:leagueId', validateToken, attachUser, validateLeagueMembership, getLeaguePublicKeys);
router.get('/chat/:leagueId', validateToken, attachUser, validateLeagueMembership, getMessages);
router.post('/chat/:leagueId', validateToken, attachUser, validateLeagueMembership, chatUpload.single('image'), sendMessage);
router.delete('/chat/:leagueId/:messageId', validateToken, attachUser, validateLeagueMembership, deleteMessage);
router.get('/chat/:leagueId/:messageId/image', validateToken, attachUser, validateLeagueMembership, getMessageImage);

export default router;
