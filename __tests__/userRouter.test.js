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
const User_1 = require("../src/models/common/User");
const GameType_1 = require("../src/interfaces/GameType");
describe('User Registration Endpoint', () => {
    let mongoServer;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        mongoServer = yield mongodb_memory_server_1.MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        yield mongoose_1.default.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }));
    afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
        yield User_1.User.deleteMany({});
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connection.dropDatabase();
        yield mongoose_1.default.connection.close();
        yield mongoServer.stop();
    }));
    test('should create a new user with valid data', () => __awaiter(void 0, void 0, void 0, function* () {
        const newUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/user').send(newUser).expect(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(newUser.username);
        expect(response.body.email).toBe(newUser.email);
        expect(response.body).not.toHaveProperty('passwordHash');
    }));
    test('should return 400 if required fields are missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/user').send({ username: 'testuser' }).expect(400);
        expect(response.body).toHaveProperty('error');
    }));
    test('should hash the password before saving', () => __awaiter(void 0, void 0, void 0, function* () {
        const password = 'password123';
        const newUser = {
            username: 'secureuser',
            name: 'Secure User',
            email: 'secure@example.com',
            password,
            matches: []
        };
        yield (0, supertest_1.default)(app_1.default).post('/api/user').send(newUser).expect(201);
        const savedUser = yield User_1.User.findOne({ username: 'secureuser' });
        expect(savedUser).not.toBeNull();
        expect(savedUser.passwordHash).not.toBe(password);
        expect(savedUser.passwordHash).toBeDefined();
    }));
    test('Adding nhl matches updates users matches', () => __awaiter(void 0, void 0, void 0, function* () {
        const myUser = {
            username: 'myUser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        const newUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        const myUSerResponse = yield (0, supertest_1.default)(app_1.default).post('/api/user').send(myUser).expect(201);
        expect(myUSerResponse.body.id).toBeDefined();
        const homePlayerID = myUSerResponse.body.id;
        const newUerResponse = yield (0, supertest_1.default)(app_1.default).post('/api/user').send(newUser).expect(201);
        expect(newUerResponse.body.id).toBeDefined();
        const awayPlayerID = newUerResponse.body.id;
        const nhlGame = {
            gameType: GameType_1.GameType.NHL,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: 'myUser',
            awayPlayer: 'testuser',
            homeScore: 3,
            awayScore: 2,
            createdAt: '2024-03-06T12:00:00Z',
            overTime: false,
            penalties: false
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game').send(nhlGame).expect(201);
        expect(response.body.homePlayer).toBe(homePlayerID);
        expect(response.body.awayPlayer).toBe(awayPlayerID);
    }));
    test('Adding fifa matches updates users matches', () => __awaiter(void 0, void 0, void 0, function* () {
        const myUser = {
            username: 'myUser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        const newUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        const myUSerResponse = yield (0, supertest_1.default)(app_1.default).post('/api/user').send(myUser).expect(201);
        expect(myUSerResponse.body.id).toBeDefined();
        const homePlayerID = myUSerResponse.body.id;
        const newUerResponse = yield (0, supertest_1.default)(app_1.default).post('/api/user').send(newUser).expect(201);
        expect(newUerResponse.body.id).toBeDefined();
        const awayPlayerID = newUerResponse.body.id;
        const fifaGame = {
            gameType: GameType_1.GameType.FIFA,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            homePlayer: 'myUser',
            awayPlayer: 'testuser',
            homeScore: 3,
            awayScore: 2,
            createdAt: '2024-03-06T12:00:00Z',
            overTime: false,
            penalties: false
        };
        const response = yield (0, supertest_1.default)(app_1.default).post('/api/game').send(fifaGame).expect(201);
        expect(response.body.homePlayer).toBe(homePlayerID);
        expect(response.body.awayPlayer).toBe(awayPlayerID);
    }));
});
