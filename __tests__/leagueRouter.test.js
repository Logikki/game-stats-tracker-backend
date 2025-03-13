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
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("../src/app"));
const supertest_1 = __importDefault(require("supertest"));
const mongodb_memory_server_1 = require("mongodb-memory-server");
const User_1 = require("../src/models/common/User");
const bcrypt_1 = require("bcrypt");
const config_1 = require("../src/utils/config");
const BaseGame_1 = require("../src/models/common/BaseGame");
const League_1 = require("../src/models/league/League");
const GameType_1 = require("../src/interfaces/GameType");
describe('League Endpoints', () => {
    let mongoServer;
    let testUser;
    let testUser2;
    let league;
    let nhlGame;
    let authToken;
    let unauthorizedToken;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        jest.setTimeout(10000); // Increase Jest timeout to 10 seconds
        mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        yield mongoose_1.default.disconnect();
        yield mongoose_1.default.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        testUser = yield User_1.User.create({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: yield (0, bcrypt_1.hash)('password123', config_1.SALT_ROUNDS)
        });
        testUser2 = yield User_1.User.create({
            username: 'testuser2',
            name: 'Test User 2',
            email: 'test2@example.com',
            passwordHash: yield (0, bcrypt_1.hash)('password123', config_1.SALT_ROUNDS)
        });
        league = yield League_1.League.create({
            name: 'Test League',
            description: 'League for testing',
            gameTypes: ['NHL'],
            admins: [{ userId: testUser._id }], // Test user is the admin
            users: [{ userId: testUser._id }, { userId: testUser2._id }],
            duration: '2025-12-31T23:59:59.000Z',
            matches: []
        });
        nhlGame = yield BaseGame_1.BaseGame.create({
            gameType: GameType_1.GameType.NHL,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: testUser._id,
            awayPlayer: testUser2._id,
            homeScore: 3,
            awayScore: 2,
            overTime: false,
            penalties: false,
            createdAt: Date.now()
        });
        league.matches.push({ matchId: nhlGame._id, matchType: GameType_1.GameType.NHL });
        yield league.save();
        // Login and get auth token
        const loginResponse = yield (0, supertest_1.default)(app_1.default)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200);
        authToken = loginResponse.body.token;
        const unauthorizedLoginResponse = yield (0, supertest_1.default)(app_1.default)
            .post('/api/login')
            .send({ username: 'testuser2', password: 'password123' })
            .expect(200);
        unauthorizedToken = unauthorizedLoginResponse.body.token;
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
    test('Create league', () => __awaiter(void 0, void 0, void 0, function* () {
        const leagueData = {
            name: 'Test League',
            gameTypes: [GameType_1.GameType.NHL, GameType_1.GameType.FIFA],
            admins: [testUser.username], // Test user is the admin
            users: [testUser.username, testUser2.username],
            duration: '2025-12-31T23:59:59.000Z'
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/league').send(leagueData).expect(201);
        const createdLeague = response.body;
        expect(createdLeague.name).toEqual(leagueData.name);
        expect(createdLeague.gameTypes).toEqual(leagueData.gameTypes);
        expect(createdLeague.admins[0].userId).toContain(testUser.id);
        expect(createdLeague.users[0].userId).toContain(testUser.id);
        expect(createdLeague.users[1].userId).toContain(testUser2.id);
        expect(createdLeague.duration).toEqual(leagueData.duration);
    }));
    test('Add user to the league successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const hessuHopo = yield User_1.User.create({
            username: 'hessuttelija',
            name: 'Hessu Hopo',
            passwordHash: yield (0, bcrypt_1.hash)('password123', config_1.SALT_ROUNDS),
            email: 'hessuhopo@gmail.com'
        });
        yield (0, supertest_1.default)(app_1.default).post(`/api/league/user/${league.id}`).send({ username: hessuHopo.username }).expect(200);
    }));
    test('Add invalid user throws error', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default).post(`/api/league/user/${league.id}`)
            .send({ username: 'not exists' })
            .expect(404);
    }));
    test('should remove a game from the league successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);
        const updatedLeague = yield League_1.League.findById(league._id);
        expect(updatedLeague === null || updatedLeague === void 0 ? void 0 : updatedLeague.matches.some((m) => m.matchId.equals(nhlGame._id))).toBe(false);
    }));
    test('should return 401 if token is missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
            .expect(401);
    }));
    test('should return 401 if user is not authorized', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .expect(401);
    }));
    test('should return 404 if league does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        const fakeLeagueId = new mongoose_1.default.Types.ObjectId();
        const response = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/remove-game/${fakeLeagueId}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);
        expect(response.body.message).toBe('league not found');
    }));
    test('should remove the league successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/delete/${league._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);
        const updatedLeague = yield League_1.League.findById(league._id);
        expect(updatedLeague).toBeNull();
    }));
    test('should not remove the league if user is not an admin', () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, supertest_1.default)(app_1.default)
            .delete(`/api/league/delete/${league._id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .expect(401);
        const updatedLeague = yield League_1.League.findById(league._id);
        expect(updatedLeague).toBeDefined();
    }));
});
