"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../src/app"));
const BaseGame_1 = require("../src/models/common/BaseGame");
const config_1 = require("../src/utils/config");
const bcrypt_1 = require("bcrypt");
const League_1 = require("../src/models/league/League");
const User_1 = require("../src/models/common/User");
const GameType_1 = require("../src/interfaces/GameType");
describe('Game Creation Endpoints', () => {
    let mongoServer;
    let homeUser, awayUser;
    let validGameData;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        yield mongoose_1.default.disconnect();
        yield mongoose_1.default.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        homeUser = yield User_1.User.create({
            username: 'homeplayer',
            name: 'Home Player',
            email: 'home@example.com',
            passwordHash: yield (0, bcrypt_1.hash)('password', config_1.SALT_ROUNDS),
            matches: []
        });
        awayUser = yield User_1.User.create({
            username: 'awayplayer',
            name: 'Away Player',
            email: 'away@example.com',
            passwordHash: yield (0, bcrypt_1.hash)('password', config_1.SALT_ROUNDS),
            matches: []
        });
        validGameData = {
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 3,
            awayScore: 2,
            createdAt: '2024-03-06T12:00:00Z',
            overTime: false,
            penalties: false
        };
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield User_1.User.deleteMany({});
        yield BaseGame_1.BaseGame.deleteMany({});
        yield League_1.League.deleteMany({});
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connection.dropDatabase();
        yield mongoose_1.default.connection.close();
        yield mongoServer.stop();
    }));
    test('should create a new NHL game with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game')
            .send(Object.assign(Object.assign({}, validGameData), { gameType: GameType_1.GameType.NHL }))
            .expect(201);
        expect(response.body.gameType).toBe(GameType_1.GameType.NHL);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.homeTeam).toBe(validGameData.homeTeam);
        expect(response.body.awayTeam).toBe(validGameData.awayTeam);
        expect(response.body.homeScore).toBe(validGameData.homeScore);
        expect(response.body.awayScore).toBe(validGameData.awayScore);
        expect(response.body.homePlayer).toBe(homeUser.id);
        expect(response.body.awayPlayer).toBe(awayUser.id);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.overTime).toBe(false);
        expect(response.body.penalties).toBe(false);
    }));
    test('should return 400 if required fields are missing for NHL game', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game')
            .send({ homeTeam: 'Team A', gameType: GameType_1.GameType.NHL })
            .expect(400);
        expect(response.body).toHaveProperty('error');
    }));
    test('should create a new FIFA game with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game')
            .send(Object.assign(Object.assign({}, validGameData), { gameType: GameType_1.GameType.FIFA, overTime: true, penalties: true }))
            .expect(201);
        expect(response.body.gameType).toBe(GameType_1.GameType.FIFA);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.homeTeam).toBe(validGameData.homeTeam);
        expect(response.body.awayTeam).toBe(validGameData.awayTeam);
        expect(response.body.homeScore).toBe(validGameData.homeScore);
        expect(response.body.awayScore).toBe(validGameData.awayScore);
        expect(response.body.homePlayer).toBe(homeUser.id);
        expect(response.body.awayPlayer).toBe(awayUser.id);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.overTime).toBe(true);
        expect(response.body.penalties).toBe(true);
    }));
    test('NHL game with null overtime and penalties return null', () => __awaiter(void 0, void 0, void 0, function* () {
        const gameData = {
            gameType: GameType_1.GameType.NHL,
            homeTeam: 'Team X',
            awayTeam: 'Team Y',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 4,
            awayScore: 1,
            createdAt: '2024-03-06T14:00:00Z'
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game').send(gameData).expect(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.awayTeam).toBe(gameData.awayTeam);
        expect(response.body.homeTeam).toBe(gameData.homeTeam);
        expect(response.body.homeScore).toBe(gameData.homeScore);
        expect(response.body.awayScore).toBe(gameData.awayScore);
        expect(response.body.homePlayer).toBe(homeUser.id);
        expect(response.body.awayPlayer).toBe(awayUser.id);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.overTime).toBeNull();
        expect(response.body.penalties).toBeNull();
    }));
    test('Add game to NHL league', () => __awaiter(void 0, void 0, void 0, function* () {
        const newLeague = yield League_1.League.create({
            name: 'Test League',
            description: 'This is a test league',
            gameTypes: [GameType_1.GameType.NHL],
            admins: [{ userId: homeUser._id }],
            users: [{ userId: homeUser._id }, { userId: awayUser._id }],
            duration: '2025-12-31T23:59:59.000Z'
        });
        const gameData = {
            gameType: GameType_1.GameType.NHL,
            league: newLeague.id,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 3,
            awayScore: 2,
            createdAt: '2024-03-06T12:00:00Z',
            overTime: false,
            penalties: false
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game').send(gameData).expect(201);
        const updatedLeague = yield League_1.League.findById(newLeague.id);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.league).toBe(newLeague.id);
        expect(updatedLeague === null || updatedLeague === void 0 ? void 0 : updatedLeague.matches[0].matchId.toString()).toEqual(response.body._id);
    }));
    test('should return 400 if required fields are missing for FIFA game', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .post('/api/game').send({ homeTeam: 'Team X' })
            .expect(400);
        expect(response.body).toHaveProperty('error');
    }));
    test('should return 403 if user is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .post('/api/game')
            .send(Object.assign(Object.assign({}, validGameData), { homePlayer: 'Ropert Pattinson', gameType: GameType_1.GameType.NHL }))
            .expect(404);
        expect(response.body).toHaveProperty('error');
    }));
    test('Users not in league should return 400 ', () => __awaiter(void 0, void 0, void 0, function* () {
        const newLeague = yield League_1.League.create({
            name: 'Test League',
            description: 'This is a test league',
            gameTypes: [GameType_1.GameType.NHL],
            admins: [{ userId: homeUser._id }],
            users: [{ userId: homeUser._id }],
            duration: '2025-12-31T23:59:59.000Z'
        });
        const gameData = {
            gameType: GameType_1.GameType.NHL,
            league: newLeague.id,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 3,
            awayScore: 2,
            createdAt: '2024-03-06T12:00:00Z',
            overTime: false,
            penalties: false
        };
        yield (0, supertest_1.default)(app_1.default).post('/api/game').send(gameData).expect(400);
    }));
});
