import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app';
import { User } from '@models/common/User';
import { BaseGame } from '@models/common/BaseGame';
import { SALT_ROUNDS } from '@utils/config';
import { hash } from 'bcrypt';
import { League } from '@models/league/League';
import { GameType } from '@interfaces/GameType';

describe('Game Creation Endpoints', () => {
    let mongoServer: MongoMemoryServer;

    let homeUser: any, awayUser: any;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.disconnect();
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    beforeEach(async () => {
        homeUser = await User.create({
            username: 'homeplayer',
            name: 'Home Player',
            email: 'home@example.com',
            passwordHash: await hash('password', SALT_ROUNDS),
            matches: []
        });

        awayUser = await User.create({
            username: 'awayplayer',
            name: 'Away Player',
            email: 'away@example.com',
            passwordHash: await hash('password', SALT_ROUNDS),
            matches: []
        });
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

    test('should create a new NHL game with valid data', async () => {
        const gameData = {
            gameType: GameType.NHL,
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

        const response = await request(app).post('/api/game').send(gameData).expect(201);

        expect(response.body.gameType).toBe(GameType.NHL);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.homeTeam).toBe(gameData.homeTeam);
        expect(response.body.awayTeam).toBe(gameData.awayTeam);
        expect(response.body.homeScore).toBe(gameData.homeScore);
        expect(response.body.awayScore).toBe(gameData.awayScore);
        expect(response.body.homePlayer).toBe(homeUser.id);
        expect(response.body.awayPlayer).toBe(awayUser.id);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.overTime).toBe(false);
        expect(response.body.penalties).toBe(false);
    });

    test('should return 400 if required fields are missing for NHL game', async () => {
        const response = await request(app).post('/api/game').send({ homeTeam: 'Team A' }).expect(400);

        expect(response.body).toHaveProperty('error');
    });

    test('should create a new FIFA game with valid data', async () => {
        const gameData = {
            gameType: GameType.FIFA,
            homeTeam: 'Team X',
            awayTeam: 'Team Y',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 4,
            awayScore: 1,
            createdAt: '2024-03-06T14:00:00Z',
            overTime: true,
            penalties: true
        };

        const response = await request(app).post('/api/game').send(gameData).expect(201);

        expect(response.body.gameType).toBe(GameType.FIFA);
        expect(response.body).toHaveProperty('_id');
        expect(response.body.homeTeam).toBe(gameData.homeTeam);
        expect(response.body.awayTeam).toBe(gameData.awayTeam);
        expect(response.body.homeScore).toBe(gameData.homeScore);
        expect(response.body.awayScore).toBe(gameData.awayScore);
        expect(response.body.homePlayer).toBe(homeUser.id);
        expect(response.body.awayPlayer).toBe(awayUser.id);
        expect(response.body.createdAt).toBeDefined();
        expect(response.body.overTime).toBe(true);
        expect(response.body.penalties).toBe(true);
    });

    test('NHL game with null overtime and penalties return null', async () => {
        const gameData = {
            gameType: GameType.NHL,
            homeTeam: 'Team X',
            awayTeam: 'Team Y',
            homePlayer: 'homeplayer',
            awayPlayer: 'awayplayer',
            homeScore: 4,
            awayScore: 1,
            createdAt: '2024-03-06T14:00:00Z'
        };

        const response = await request(app).post('/api/game').send(gameData).expect(201);

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
    });

    test('Add game to NHL league', async () => {
        const newLeague = await League.create({
            name: 'Test League',
            description: 'This is a test league',
            gameTypes: [GameType.NHL],
            admins: [{ userId: homeUser._id }],
            users: [{ userId: homeUser._id }, { userId: awayUser._id }],
            duration: '2025-12-31T23:59:59.000Z'
        });

        const gameData = {
            gameType: GameType.NHL,
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

        const response = await request(app).post('/api/game').send(gameData).expect(201);
        const updatedLeague = await League.findById(newLeague.id);

        expect(response.body).toHaveProperty('_id');
        expect(response.body.league).toBe(newLeague.id);
        expect(updatedLeague?.matches[0].matchId.toString()).toEqual(response.body._id);
    });

    test('should return 400 if required fields are missing for FIFA game', async () => {
        const response = await request(app).post('/api/game').send({ homeTeam: 'Team X' }).expect(400);

        expect(response.body).toHaveProperty('error');
    });
});
