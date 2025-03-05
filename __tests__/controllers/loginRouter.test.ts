import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import app from '../../src/app';
import { User } from '@models/common/User';
import { SALT_ROUNDS } from '@utils/config';
import { hash } from 'bcrypt';

describe('Login Endpoint', () => {
    let mongoServer: MongoMemoryServer;
    let testUser: any;

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
        testUser = await User.create({
            username: 'testuser',
            name: 'Test User',
            email: 'test@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS),
            matches: []
        });
    });

    afterEach(async () => {
        await User.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    test('should login with valid credentials', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'password123' })
            .expect(200);

        expect(response.body).toHaveProperty('token');
        expect(response.body.username).toBe('testuser');
    });

    test('should return 401 for invalid credentials', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ username: 'testuser', password: 'wrongpassword' })
            .expect(401);

        expect(response.body).toHaveProperty('error', 'invalid username or password');
    });

    test('should return 401 for non-existing user', async () => {
        const response = await request(app)
            .post('/api/login')
            .send({ username: 'nonexistent', password: 'password123' })
            .expect(401);

        expect(response.body).toHaveProperty('error', 'invalid username or password');
    });
});
