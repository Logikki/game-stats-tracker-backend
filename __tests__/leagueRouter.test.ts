import mongoose from 'mongoose';
import app from '../src/app';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/common/User';
import { hash } from 'bcrypt';
import { SALT_ROUNDS } from '../src/utils/config';
import { BaseGame } from '../src/models/common/BaseGame';
import { League } from '../src/models/league/League';
import { GameType } from '../src/interfaces/GameType';

describe('League Endpoints', () => {
    let mongoServer: MongoMemoryServer;
    let testUser: any;
    let testUser2: any;
    let league: any;
    let nhlGame: any;
    let authToken: string;
    let unauthorizedToken: string;

    beforeAll(async () => {
        jest.setTimeout(10000); // Increase Jest timeout to 10 seconds
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.disconnect();
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    beforeEach(async () => {
        testUser = await User.create({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        testUser2 = await User.create({
            username: 'testuser2',
            name: 'Test User 2',
            email: 'test2@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        league = await League.create({
            name: 'Test League',
            description: 'League for testing',
            gameTypes: ['NHL'],
            admins: [{ userId: testUser._id }], // Test user is the admin
            users: [{ userId: testUser._id }, { userId: testUser2._id }],
            duration: '2025-12-31T23:59:59.000Z',
            matches: []
        });

        nhlGame = await BaseGame.create({
            gameType: GameType.NHL,
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

        league.matches.push({ matchId: nhlGame._id, matchType: GameType.NHL });
        await league.save();

        // Login and get auth token
        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200);

        authToken = loginResponse.body.token;

        const unauthorizedLoginResponse = await request(app)
            .post('/api/login')
            .send({ username: 'testuser2', password: 'password123' })
            .expect(200);

        unauthorizedToken = unauthorizedLoginResponse.body.token;
    });

    afterEach(async () => {
        await User.deleteMany({});
        await BaseGame.deleteMany({});
        await League.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test('Create league', async () => {
        const leagueData = {
            name: 'Test League',
            gameTypes: [GameType.NHL, GameType.FIFA],
            admins: [testUser.username], // Test user is the admin
            users: [testUser.username, testUser2.username],
            duration: '2025-12-31T23:59:59.000Z'
        };

        const response = await request(app).post('/api/league').send(leagueData).expect(201);
        const createdLeague = response.body;

        expect(createdLeague.name).toEqual(leagueData.name);
        expect(createdLeague.gameTypes).toEqual(leagueData.gameTypes);
        expect(createdLeague.admins[0].userId).toContain(testUser.id);
        expect(createdLeague.users[0].userId).toContain(testUser.id);
        expect(createdLeague.users[1].userId).toContain(testUser2.id);
        expect(createdLeague.duration).toEqual(leagueData.duration);
    });

    test('Add user to the league successfully', async () => {
        const hessuHopo = await User.create({
            username: 'hessuttelija',
            name: 'Hessu Hopo',
            passwordHash: await hash('password123', SALT_ROUNDS),
            email: 'hessuhopo@gmail.com'
        });

        await request(app).post(`/api/league/user/${league.id}`).send({ username: hessuHopo.username }).expect(200);
    });

    test('Add invalid user throws error', async () => {
        await request(app).post(`/api/league/user/${league.id}`)
        .send({ username: 'not exists' })
        .expect(404);
    });

    test('should remove a game from the league successfully', async () => {
        const response = await request(app)
            .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);

        const updatedLeague = await League.findById(league._id);

        expect(updatedLeague?.matches.some((m) => m.matchId.equals(nhlGame._id))).toBe(false);
    });

    test('should return 401 if token is missing', async () => {
        const response = await request(app)
        .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
        .expect(401);
    });

    test('should return 401 if user is not authorized', async () => {
        const response = await request(app)
            .delete(`/api/league/remove-game/${league._id}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .expect(401);
    });

    test('should return 404 if league does not exist', async () => {
        const fakeLeagueId = new mongoose.Types.ObjectId();

        const response = await request(app)
            .delete(`/api/league/remove-game/${fakeLeagueId}/${nhlGame._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(404);

        expect(response.body.message).toBe('league not found');
    });

    test('should remove the league successfully', async () => {
        const response = await request(app)
            .delete(`/api/league/delete/${league._id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);

        const updatedLeague = await League.findById(league._id);

        expect(updatedLeague).toBeNull();
    });

    test('should not remove the league if user is not an admin', async () => {
        await request(app)
            .delete(`/api/league/delete/${league._id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .expect(401);

        const updatedLeague = await League.findById(league._id);

        expect(updatedLeague).toBeDefined();
    });
});
