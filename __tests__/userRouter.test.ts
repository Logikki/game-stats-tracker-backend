import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/common/User';
import { GameType } from '../src/common/enums/GameType';
import { isExpression } from 'typescript';

describe('User Registration Endpoint', () => {
    let mongoServer: MongoMemoryServer;
    // Test data constants
    let myUser: {
        username: string;
        name: string;
        email: string;
        password: string;
        matches: any[];
    };
    let testUser: {
        username: string;
        name: string;
        email: string;
        password: string;
        matches: any[];
    };
    let userIds: {
        homePlayerId?: string;
        awayPlayerId?: string;
    };
    let gameData: {
        nhl: any;
        fifa: any;
    };

    let authToken: string;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    beforeEach(async () => {
        myUser = {
            username: 'myUser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };
        testUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };

        userIds = {
            homePlayerId: undefined,
            awayPlayerId: undefined
        };

        // Base game data that will be used for both game types
        const baseGameData = {
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

        gameData = {
            nhl: {
                ...baseGameData,
                gameType: GameType.NHL
            },
            fifa: {
                ...baseGameData,
                gameType: GameType.FIFA
            }
        };
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    // Helper function to create users
    const createUsers = async () => {
        const myUserResponse = await request(app)
            .post('/api/user')
            .send(myUser)
            .expect(201);

        userIds.homePlayerId = myUserResponse.body.id;

        const testUserResponse = await request(app)
            .post('/api/user')
            .send(testUser)
            .expect(201);

        userIds.awayPlayerId = testUserResponse.body.id;

        return { myUserResponse, testUserResponse };
    };

    test('should create a new user with valid data', async () => {
        const response = await request(app)
            .post('/api/user')
            .send(testUser)
            .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(testUser.username);
        expect(response.body.email).toBe(testUser.email);
        expect(response.body).not.toHaveProperty('passwordHash');
    });

    test('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .post('/api/user')
            .send({ username: 'testuser' })
            .expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should hash the password before saving', async () => {
        const password = testUser.password;
        
        await request(app)
            .post('/api/user')
            .send(testUser)
            .expect(201);
        
        const savedUser = await User.findOne({ username: testUser.username });

        expect(savedUser).not.toBeNull();
        expect(savedUser!.passwordHash).not.toBe(password);
        expect(savedUser!.passwordHash).toBeDefined();
    });

    test('Adding nhl matches updates users matches', async () => {
        const { myUserResponse, testUserResponse } = await createUsers();

        expect(myUserResponse.body.id).toBeDefined();
        expect(testUserResponse.body.id).toBeDefined();

        const response = await request(app)
            .post('/api/game')
            .send(gameData.nhl)
            .expect(201);

        expect(response.body.homePlayer).toBe(userIds.homePlayerId);
        expect(response.body.awayPlayer).toBe(userIds.awayPlayerId);
    });

    test('Adding fifa matches updates users matches', async () => {
        const { myUserResponse, testUserResponse } = await createUsers();

        expect(myUserResponse.body.id).toBeDefined();
        expect(testUserResponse.body.id).toBeDefined();

        const response = await request(app)
            .post('/api/game')
            .send(gameData.fifa)
            .expect(201);

        expect(response.body.homePlayer).toBe(userIds.homePlayerId);
        expect(response.body.awayPlayer).toBe(userIds.awayPlayerId);
    });

    test('Get user succeeds if logged in, correct response values', async () => {
        const { myUserResponse, testUserResponse } = await createUsers();

        const gameResponse = await request(app).post('/api/game')
            .send(gameData.nhl)
            .expect(201);        
        
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: myUser.username, password: myUser.password })
            .expect(200);
    
        authToken = loginResponse.body.token;

        const userResponse = await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        const body = userResponse.body;

        expect(body.username).toEqual(myUser.username);
        expect(body.name).toEqual(myUser.name);
        expect(body._id).toEqual(myUserResponse.body._id);
        expect(body.leagues).toBeDefined();
        
        expect(body.matches.length).toBe(1);
        expect(body.matches[0]._id).toBe(gameResponse.body._id);

        expect(body.matches[0].homePlayer.username).toBe(myUserResponse.body.username);
        expect(body.matches[0].homePlayer._id).toBe(myUserResponse.body._id);
        expect(body.matches[0].homePlayer.leagues).toBeUndefined();
        expect(body.matches[0].homePlayer.matches).toBeUndefined();

        expect(body.matches[0].awayPlayer.username).toBe(testUserResponse.body.username);
        expect(body.matches[0].awayPlayer._id).toBe(testUserResponse.body._id);
        expect(body.matches[0].awayPlayer.leagues).toBeUndefined();
        expect(body.matches[0].awayPlayer.matches).toBeUndefined();
        });

    test('Get user fails  if no logged in', async () => {
        await request(app)
            .post('/api/user')
            .send(myUser)
            .expect(201);

        // Login and get auth token
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: myUser.username, password: "wrong pass" })
            .expect(401);
    
        authToken = loginResponse.body.token;

        await request(app)
            .get('/api/user')
            .set('Authorization', `Bearer safasf`)
            .expect(403);
        });
});