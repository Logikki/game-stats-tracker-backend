import { createGame, getGames } from "@controllers/games";
import { createLeague, deleteGame, deleteLeague, putUserToLeague } from "@controllers/leagues";
import { login } from "@controllers/login";
import { createUser } from "@controllers/users";
import { attachUser, validateAdmin, validateToken } from "@utils/middleware";
import { Router } from "express";

const router = Router();

router.post('/login', login)
router.post('/game', createGame);
router.post('/league', createLeague)
router.post('/league/user/:leagueId/', putUserToLeague)
router.post('/user', createUser)

router.get('/game', getGames)

router.delete('/league/remove-game/:leagueId/:gameId',validateToken, attachUser, validateAdmin, deleteGame)
router.delete('/league/delete/:leagueId/', validateToken, attachUser, validateAdmin, deleteLeague)

export default router;
