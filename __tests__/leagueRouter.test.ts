import mongoose from 'mongoose';
import app from '../src/app';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User/User';
import { hash } from 'bcrypt';
import { SALT_ROUNDS } from '../src/utils/config';
import { BaseGame } from '../src/models/Games/BaseGame';
import { League } from '../src/models/league/League';
import { GameType } from '../src/common/enums/GameType';

describe('League Endpoints', () => {
    let mongoServer: MongoMemoryServer;
    let testUser: any;
    let testUser2: any;
    let randomUser: any;
    let league: any;
    let nhlGame: any;
    let authToken: string;
    let unauthorizedToken: string;
    let randomUserAuthToken: string

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

        randomUser = await User.create({
            username: 'random user',
            name: 'random randalin',
            email: 'extra@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        league = await League.create({
            name: 'Test League',
            description: 'League for testing',
            gameTypes: ['NHL'],
            admins: [testUser.id],
            users: [testUser.id, testUser2.id],
            duration: '2025-12-31T23:59:59.000Z',
            matches: []
        });

        nhlGame = await BaseGame.create({
            gameType: GameType.NHL,
            homeTeam: 'Team A',
            awayTeam: 'Team B',
            league: league.id,
            homePlayer: testUser.id,
            awayPlayer: testUser2.id,
            homeScore: 3,
            awayScore: 2,
            overTime: false,
            penalties: false,
            createdAt: Date.now()
        });

        league.matches.push(nhlGame.id);
        testUser.matches.push(nhlGame);
        testUser2.matches.push(nhlGame);
        await league.save();
        await testUser.save();
        await testUser2.save();

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

        const randLoginResponse = await request(app)
            .post('/api/login')
            .send({ username: randomUser.username, password: 'password123' })
            .expect(200);

        randomUserAuthToken = randLoginResponse.body.token;
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

    test('Create league creates league and updates users', async () => {
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
        expect(createdLeague.admins[0]).toEqual(testUser.id);
        expect(createdLeague.users[0]).toEqual(testUser.id);
        expect(createdLeague.users[1]).toEqual(testUser2.id);
        expect(createdLeague.duration).toEqual(leagueData.duration);

        const updatedUser = await User.findById(testUser.id);
        expect(updatedUser?.leagues.length).toEqual(1);
        
        const updatedUser2 = await User.findById(testUser2.id);
        expect(updatedUser2?.leagues.length).toEqual(1)

    });

    test('Add user to the league successfully if admin, updates user as well', async () => {
        const hessuHopo = await User.create({
            username: 'hessuttelija',
            name: 'Hessu Hopo',
            passwordHash: await hash('password123', SALT_ROUNDS),
            email: 'hessuhopo@gmail.com'
        });

        await request(app)
            .post(`/api/league/user/${league.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: hessuHopo.username })
            .expect(200);

        const updatedUser = await User.findById(hessuHopo.id);
        expect(updatedUser?.leagues[0].toString()).toContain(league.id);
    });

    test ('Add user insuccessfully if not admin, does not update user', async () => {
        const hessuHopo = await User.create({
            username: 'hessuttelija',
            name: 'Hessu Hopo',
            passwordHash: await hash('password123', SALT_ROUNDS),
            email: 'hessuhopo@gmail.com'
        });

        await request(app)
            .post(`/api/league/user/${league.id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .send({ username: hessuHopo.username })
            .expect(403);

        const updatedUser = await User.findById(hessuHopo.id);
        expect(updatedUser?.leagues.length).toEqual(0);   
        });

    test('Add invalid user throws error 404', async () => {
        await request(app)
            .post(`/api/league/user/${league.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({ username: 'not exists' })
            .expect(404);
    });

    test('should remove a game from the league successfully, updates user', async () => { 
        expect(testUser.matches.length).toEqual(1);
        expect(testUser2.matches.length).toEqual(1);
        expect(league.matches.length).toEqual(1);

        await request(app)
            .delete(`/api/game/remove/${nhlGame.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);

        const updatedLeague = await League.findById(league.id);
        const updatedUser = await User.findById(testUser.id);
        const updatedUser2 = await User.findById(testUser2.id);

        expect(updatedUser!.matches.length).toEqual(0);
        expect(updatedUser2!.matches.length).toEqual(0);
        expect(updatedLeague!.matches.length).toEqual(0);
    });

    test('should remove the game if game is not attached to any league', async () => {
        await request(app)
            .delete(`/api/game/remove/${nhlGame.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);
    });

    test('should not remove game if user is not part of the game', async () => { 
        expect(testUser.matches.length).toEqual(1);
        expect(testUser2.matches.length).toEqual(1);
        expect(league.matches.length).toEqual(1);

        await request(app)
            .delete(`/api/game/remove/${nhlGame.id}`)
            .set('Authorization', `Bearer ${randomUserAuthToken}`)
            .expect(403);

        const updatedLeague = await League.findById(league.id);
        expect(updatedLeague?.matches.length).toEqual(1);

        const updatedUser = await User.findById(testUser.id);
        const updatedUser2 = await User.findById(testUser2.id);
        expect(updatedUser!.matches.length).toEqual(1);
        expect(updatedUser2!.matches.length).toEqual(1);
    });

    test('should return 403 if token is missing', async () => {
        const response = await request(app)
        .delete(`/api/game/remove/${nhlGame.id}`)
        .expect(403);
    });

    test('should remove the league successfully', async () => {
        const response = await request(app)
            .delete(`/api/league/delete/${league.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(204);

        const updatedLeague = await League.findById(league.id);

        expect(updatedLeague).toBeNull();
    });

    test('should not remove the league if user is not an admin', async () => {
        await request(app)
            .delete(`/api/league/delete/${league.id}`)
            .set('Authorization', `Bearer ${unauthorizedToken}`)
            .expect(403);

        const updatedLeague = await League.findById(league.id);

        expect(updatedLeague).toBeDefined();
    });
});
