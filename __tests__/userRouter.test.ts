import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { User } from '../src/models/User/User';
import { GameType } from '../src/common/enums/GameType';
import { ProfileVisibility } from '../src/common/enums/ProfileVisibility';
import { League } from '../src/models/league/League';
import { BaseGame } from '../src/models/Games/BaseGame';
import { hash } from 'bcrypt';
import { SALT_ROUNDS } from '../src/utils/config';

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

        const updatedUser = await User.findById(myUserResponse.body.id);
        expect(updatedUser!.matches.length).toEqual(1);
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

        const updatedUser = await User.findById(myUserResponse.body.id);
        expect(updatedUser!.matches.length).toEqual(1);
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
            .get('/api/user/own')
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

        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: myUser.username, password: "wrong pass" })
            .expect(401);
    
        authToken = loginResponse.body.token;

        await request(app)
            .get('/api/user/own')
            .set('Authorization', `Bearer safasf`)
            .expect(403);
    });
});

// TODO: FIX THESE

describe('get user', () => {
    let mongoServer: MongoMemoryServer;
    let homeUser: any;
    let testUser: any;
    let authToken: string;
    let testLeague: any;
    let testGame: any

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    beforeEach(async () => {
        homeUser = await User.create({
            username: 'homeUser',
            name: 'Home User',
            email: 'home@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS),
            matches: []
        });

        testUser = await User.create({
            username: 'awayUser',
            name: 'Away User',
            email: 'away@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS),
            matches: []
        });

        testLeague = await League.create({
            name: 'Test League',
            description: 'This is a test league',
            gameTypes: [GameType.NHL],
            admins: [homeUser._id],
            users: [homeUser._id, testUser._id],
            duration: '2025-12-31T23:59:59.000Z'
        });

        testGame = await BaseGame.create({
            gameType: GameType.NHL,
            homeTeam: 'Test Team',
            awayTeam: 'Away Team',
            createdAt: '2024-03-06T12:00:00Z',
            homeScore: 1,
            awayScore: 2,
            homePlayer: homeUser._id,
            awayPlayer: testUser._id,
        });
    });

    afterEach(async () => {
        await User.deleteMany({});
        await League.deleteMany({});
        await BaseGame.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test('update user visibility', async () => {
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: homeUser.username, password: "password123" })
            .expect(200);
        
        authToken = loginResponse.body.token;

        await request(app)
            .post('/api/user/visibility')
            .set('Authorization', `Bearer ${authToken}`)
            .send({ visibility: ProfileVisibility.Public })
            .expect(200);
        
        const updatedUser = await User.findById(homeUser.id);
        expect(updatedUser!.profileVisibility).toEqual(ProfileVisibility.Public);
    });

    test('should fetch user profile if visible', async () => {
        await User.findByIdAndUpdate(testUser.id, { profileVisibility: ProfileVisibility.Public });

        const loginResponse = await request(app).post('/api/login')
        .send({ username: homeUser.username, password: "password123" })
        .expect(200);

        authToken = loginResponse.body.token;

        const userResponse = await request(app)
            .get(`/api/user/${testUser.username}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(userResponse.body.username).toBe(testUser.username);
        expect(userResponse.body.name).toBe(testUser.name);
    });

    test('should return 403 if profile is private', async () => {
        await User.findByIdAndUpdate(testUser.id, { profileVisibility: ProfileVisibility.Private });

        const loginResponse = await request(app).post('/api/login')
            .send({ username: homeUser.username, password: "password123" })
            .expect(200);

        authToken = loginResponse.body.token;

        await request(app)
            .get(`/api/user/${testUser.username}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(403);
    });

    test('should return 403 if not authenticated', async () => {
        await request(app).get(`/api/user/${testUser.username}`).expect(403);
    });

    test('should return 404 if user does not exist', async () => {
        const loginResponse = await request(app).post('/api/login')
            .send({ username: homeUser.username, password: "password123" })
            .expect(200);
        
        authToken = loginResponse.body.token;

        await request(app)
            .get(`/api/user/nonexistentUser`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);
    });

    test('should return user profile with populated matches', async () => {
        await User.findByIdAndUpdate(homeUser.id, { profileVisibility: ProfileVisibility.Public, matches: [testGame] });

        const loginResponse = await request(app).post('/api/login')
        .send({ username: homeUser.username, password: "password123" })
        .expect(200);
        authToken = loginResponse.body.token;

        const userResponse = await request(app)
            .get(`/api/user/${homeUser.username}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(userResponse.body.username).toBe(homeUser.username);
        expect(userResponse.body.name).toBe(homeUser.name);
        expect(userResponse.body.matches.length).toBe(1);
        expect(userResponse.body.matches[0]._id).toBe(testGame.id);
    });

    test('should return user profile with populated friends', async () => {
        await User.findByIdAndUpdate(homeUser.id, { profileVisibility: ProfileVisibility.Public, friends: [testUser] });

        const loginResponse = await request(app).post('/api/login')
        .send({ username: homeUser.username, password: "password123" })
        .expect(200);
        authToken = loginResponse.body.token;

        const userResponse = await request(app)
            .get(`/api/user/${homeUser.username}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(userResponse.body.username).toBe(homeUser.username);
        expect(userResponse.body.name).toBe(homeUser.name);
        expect(userResponse.body.friends.length).toBe(1);
        expect(userResponse.body.friends[0].username).toBe(testUser.username);
    }); 
});
