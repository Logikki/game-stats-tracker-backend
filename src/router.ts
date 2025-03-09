import { createGame, getGames } from "@controllers/game";
import { createLeague, deleteGame, deleteLeague, putUserToLeague } from "@controllers/league";
import { login } from "@controllers/login";
import { createUser } from "@controllers/user";
import { Router } from "express";

const router = Router();

router.post('/login', login)
router.post('/game', createGame);
router.post('/league', createLeague)
router.post('/league/user/:leagueId/', putUserToLeague)
router.post('/user', createUser)

router.get('/game', getGames)

router.delete('/league/remove-game/:leagueId/:gameId', deleteGame)
router.delete('/league/delete/:leagueId/', deleteLeague)

export default router;
