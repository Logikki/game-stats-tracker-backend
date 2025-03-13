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
const config_1 = require("../src/utils/config");
const bcrypt_1 = require("bcrypt");
describe('Login Endpoint', () => {
    let mongoServer;
    let testUser;
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
        testUser = yield User_1.User.create({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: yield (0, bcrypt_1.hash)('password123', config_1.SALT_ROUNDS),
            matches: []
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
    test('should login with valid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body.username).toBe('testuser');
    }));
    test('should return 401 for invalid credentials', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .post('/api/login')
            .send({ username: 'testuser', password: 'wrongpassword' })
            .expect(401);
        expect(response.body).toHaveProperty('error', 'invalid username or password');
    }));
    test('should return 401 for non-existing user', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(app_1.default)
            .post('/api/login')
            .send({ username: 'nonexistent', password: 'password123' })
            .expect(401);
        expect(response.body).toHaveProperty('error', 'invalid username or password');
    }));
});
