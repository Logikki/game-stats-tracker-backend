import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../src/app';
import { League } from '../src/models/league/League';
import { User } from '../src/models/common/User';
import { Invitation } from '../src/models/Invitation';
import { SALT_ROUNDS } from '../src/utils/config';
import { hash } from 'bcrypt';

describe('League Invitation Endpoints', () => {
    let mongoServer: MongoMemoryServer;
    let user: any, admin: any, league: any;
    let adminAuthToken: string;
    let nonAdminToken: string;

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
        user = await User.create({
            username: 'testuser',
            name: 'Test User',
            email: 'testuser@example.com',
            passwordHash: await hash('password', SALT_ROUNDS),
            leagues: []
        });

        admin = await User.create({
            username: 'adminuser',
            name: 'Admin User',
            email: 'admin@example.com',
            passwordHash: await hash('password', SALT_ROUNDS),
            leagues: []
        });

        league = await League.create({
            name: 'Test League',
            description: 'This is a test league',
            gameTypes: ['NHL'],
            admins: [admin._id],
            users: [admin._id],
            duration: '2025-12-31T23:59:59.000Z'
        });

        const loginResponse = await request(app)
            .post('/api/login')
            .send({ username: 'adminuser', password: 'password' })
            .expect(200);

        adminAuthToken = loginResponse.body.token;

        const nonAdminLoginResponse = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password' })
            .expect(200);

        nonAdminToken = nonAdminLoginResponse.body.token;
    });

    afterEach(async () => {
        await User.deleteMany({});
        await League.deleteMany({});
        await Invitation.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test('should create an invitation link for a league', async () => {
        const inviteResponse = await request(app)
            .post(`/api/league/invite/${league.id}`)
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .expect(201);

        expect(inviteResponse.body).toHaveProperty('code');
    });

    test('should validate a valid invitation', async () => {
        const inviteResponse = await request(app)
            .post(`/api/league/invite/${league.id}`)
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .expect(201);

        const inviteCode = inviteResponse.body.code

        const response = await request(app)
            .post(`/api/league/join/${inviteCode}`)
            .set('Authorization', `Bearer ${nonAdminToken}`)
            .expect(200);
        
        expect(response.body.name).toBe(league.name);
    });

    test('should allow a user to accept a valid invitation', async () => {
        const inviteResponse = await request(app)
            .post(`/api/league/invite/${league.id}`)
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .expect(201);

        const inviteCode = inviteResponse.body.code;

        const response = await request(app)
            .post(`/api/league/join/${inviteCode}`)
            .set('Authorization', `Bearer ${nonAdminToken}`)
            .expect(200);

        expect(response.body).toHaveProperty('_id');
        expect(response.body._id).toContain(league.id);
    });

    test('should return 403 for an expired invitation', async () => {
        const expiredInvitation = await Invitation.create({
            code: 'expired123',
            league: league.id,
            invitedBy: admin.id,
            expiresAt: new Date(Date.now() - 1000), // Already expired
            used: false
        });

        await request(app)
            .post(`/api/league/join/${expiredInvitation.code}`)
            .set('Authorization', `Bearer ${nonAdminToken}`)
            .expect(403);
    });

    test('should return 400 if user is already in league', async () => {
        const inviteResponse = await request(app)
            .post(`/api/league/invite/${league.id}`)
            .set('Authorization', `Bearer ${adminAuthToken}`)
            .expect(201);

        const inviteCode = inviteResponse.body.code;

        await request(app)
            .post(`/api/league/join/${inviteCode}`)
            .set('Authorization', `Bearer ${nonAdminToken}`)
            .expect(200);

        // Try accepting again
        await request(app)
            .post(`/api/league/join/${inviteCode}`)
            .set('Authorization', `Bearer ${nonAdminToken}`)
            .expect(403);
    });
});
