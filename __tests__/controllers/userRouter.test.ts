import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app';
import { User } from '@models/common/User';
import { GameType } from '@interfaces/GameType';

describe('User Registration Endpoint', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test('should create a new user with valid data', async () => {
        const newUser = {
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            password: 'password123',
            matches: []
        };

        const response = await request(app).post('/api/user').send(newUser).expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.username).toBe(newUser.username);
        expect(response.body.email).toBe(newUser.email);
        expect(response.body).not.toHaveProperty('passwordHash');
    });

    test('should return 400 if required fields are missing', async () => {
        const response = await request(app).post('/api/user').send({ username: 'testuser' }).expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should hash the password before saving', async () => {
        const password = 'password123';

        const newUser = {
            username: 'secureuser',
            name: 'Secure User',
            email: 'secure@example.com',
            password,
            matches: []
        };

        await request(app).post('/api/user').send(newUser).expect(201);
        const savedUser = await User.findOne({ username: 'secureuser' });

        expect(savedUser).not.toBeNull();
        expect(savedUser!.passwordHash).not.toBe(password);
        expect(savedUser!.passwordHash).toBeDefined();
    });

    test('Adding nhl matches updates users matches', async () => {
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

        const myUSerResponse = await request(app).post('/api/user').send(myUser).expect(201);

        expect(myUSerResponse.body.id).toBeDefined();
        const homePlayerID = myUSerResponse.body.id;

        const newUerResponse = await request(app).post('/api/user').send(newUser).expect(201);

        expect(newUerResponse.body.id).toBeDefined();
        const awayPlayerID = newUerResponse.body.id;

        const nhlGame = {
            gameType: GameType.NHL,
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

        const response = await request(app).post('/api/game').send(nhlGame).expect(201);

        expect(response.body.homePlayer).toBe(homePlayerID);
        expect(response.body.awayPlayer).toBe(awayPlayerID);
    });

    test('Adding fifa matches updates users matches', async () => {
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

        const myUSerResponse = await request(app).post('/api/user').send(myUser).expect(201);

        expect(myUSerResponse.body.id).toBeDefined();
        const homePlayerID = myUSerResponse.body.id;

        const newUerResponse = await request(app).post('/api/user').send(newUser).expect(201);

        expect(newUerResponse.body.id).toBeDefined();
        const awayPlayerID = newUerResponse.body.id;

        const fifaGame = {
            gameType: GameType.FIFA,
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

        const response = await request(app).post('/api/game').send(fifaGame).expect(201);

        expect(response.body.homePlayer).toBe(homePlayerID);
        expect(response.body.awayPlayer).toBe(awayPlayerID);
    });
});
