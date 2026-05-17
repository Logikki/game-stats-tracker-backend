import mongoose from 'mongoose';
import app from '../src/app';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../src/models/User/User';
import { League } from '../src/models/league/League';
import { ChatMessage } from '../src/models/chat/ChatMessage';
import { UserPublicKey } from '../src/models/chat/UserPublicKey';
import { hash } from 'bcrypt';
import { SALT_ROUNDS } from '../src/utils/config';
import { GameType } from '../src/common/enums/GameType';

describe('Chat Endpoints', () => {
    let mongoServer: MongoMemoryServer;
    let member1: any;
    let member2: any;
    let outsider: any;
    let league: any;
    let memberToken: string;
    let member2Token: string;
    let outsiderToken: string;

    const baseMessage = {
        ciphertext: 'base64ciphertext==',
        nonce: 'base64nonce==',
        encryptedKeys: [
            {
                recipient: '',
                encryptedMEK: 'base64mek==',
                ephemeralPublicKey: 'base64epk=='
            }
        ]
    };

    beforeAll(async () => {
        jest.setTimeout(10000);
        mongoServer = await MongoMemoryServer.create();
        await mongoose.disconnect();
        await mongoose.connect(mongoServer.getUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true
        } as any);
    });

    beforeEach(async () => {
        member1 = await User.create({
            username: 'member1',
            name: 'Member One',
            email: 'member1@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        member2 = await User.create({
            username: 'member2',
            name: 'Member Two',
            email: 'member2@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        outsider = await User.create({
            username: 'outsider',
            name: 'Outsider',
            email: 'outsider@example.com',
            passwordHash: await hash('password123', SALT_ROUNDS)
        });

        league = await League.create({
            name: 'Test League',
            description: 'A test league',
            gameTypes: [GameType.NHL],
            admins: [member1.id],
            users: [member1.id, member2.id],
            duration: '2027-12-31T23:59:59.000Z'
        });

        const r1 = await request(app)
            .post('/api/login')
            .send({ username: 'member1', password: 'password123' });
        memberToken = r1.body.token;

        const r2 = await request(app)
            .post('/api/login')
            .send({ username: 'member2', password: 'password123' });
        member2Token = r2.body.token;

        const r3 = await request(app)
            .post('/api/login')
            .send({ username: 'outsider', password: 'password123' });
        outsiderToken = r3.body.token;
    });

    afterEach(async () => {
        await User.deleteMany({});
        await League.deleteMany({});
        await ChatMessage.deleteMany({});
        await UserPublicKey.deleteMany({});
    });

    afterAll(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.connection.close();
        await mongoServer.stop();
    });

    // --- Public key registration ---

    test('POST /chat/keys — registers a public key', async () => {
        const res = await request(app)
            .post('/api/chat/keys')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ publicKey: 'base64pubkey==' })
            .expect(200);

        expect(res.body.publicKey).toBe('base64pubkey==');
        expect(res.body.algorithm).toBe('x25519');
        expect(res.body.id).toBeDefined();
        expect(res.body._id).toBeUndefined();
        expect(res.body.__v).toBeUndefined();
    });

    test('POST /chat/keys — upserts on re-register', async () => {
        await request(app)
            .post('/api/chat/keys')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ publicKey: 'oldkey==' })
            .expect(200);

        await request(app)
            .post('/api/chat/keys')
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ publicKey: 'newkey==' })
            .expect(200);

        const count = await UserPublicKey.countDocuments({ user: member1.id });
        expect(count).toBe(1);

        const key = await UserPublicKey.findOne({ user: member1.id });
        expect(key!.publicKey).toBe('newkey==');
    });

    test('POST /chat/keys — 403 if unauthenticated', async () => {
        await request(app)
            .post('/api/chat/keys')
            .send({ publicKey: 'base64pubkey==' })
            .expect(403);
    });

    // --- Get league public keys ---

    test('GET /chat/keys/:leagueId — member gets all keys', async () => {
        await UserPublicKey.create({ user: member1.id, publicKey: 'key1==' });
        await UserPublicKey.create({ user: member2.id, publicKey: 'key2==' });

        const res = await request(app)
            .get(`/api/chat/keys/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);

        expect(res.body.length).toBe(2);
    });

    test('GET /chat/keys/:leagueId — outsider gets 403', async () => {
        await request(app)
            .get(`/api/chat/keys/${league.id}`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .expect(403);
    });

    // --- Send message ---

    test('POST /chat/:leagueId — member sends message, 201 + populated sender', async () => {
        const payload = {
            ...baseMessage,
            encryptedKeys: [
                { recipient: member2.id, encryptedMEK: 'mek==', ephemeralPublicKey: 'epk==' }
            ]
        };

        const res = await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(payload)
            .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body._id).toBeUndefined();
        expect(res.body.__v).toBeUndefined();
        expect(res.body.encryptedImage).toBeUndefined();
        expect(res.body.ciphertext).toBe('base64ciphertext==');
        expect(res.body.sender.username).toBe('member1');
    });

    test('POST /chat/:leagueId — outsider gets 403', async () => {
        await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .send(baseMessage)
            .expect(403);
    });

    test('POST /chat/:leagueId — missing fields returns 400', async () => {
        await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send({ ciphertext: 'abc' })
            .expect(400);
    });

    test('POST /chat/:leagueId — accepts encryptedKeys as JSON string (multer path)', async () => {
        const res = await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .field('ciphertext', 'ciphertext==')
            .field('nonce', 'nonce==')
            .field(
                'encryptedKeys',
                JSON.stringify([
                    { recipient: member2.id, encryptedMEK: 'mek==', ephemeralPublicKey: 'epk==' }
                ])
            )
            .expect(201);

        expect(res.body.ciphertext).toBe('ciphertext==');
    });

    // --- Get messages ---

    test('GET /chat/:leagueId — member gets message array', async () => {
        await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'ciphertext==',
            nonce: 'nonce==',
            encryptedKeys: []
        });

        const res = await request(app)
            .get(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
    });

    test('GET /chat/:leagueId — outsider gets 403', async () => {
        await request(app)
            .get(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${outsiderToken}`)
            .expect(403);
    });

    test('GET /chat/:leagueId — pagination with before cursor', async () => {
        const msg1 = await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'c1',
            nonce: 'n1',
            encryptedKeys: [],
            createdAt: new Date('2024-01-01T00:00:00Z')
        });

        await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'c2',
            nonce: 'n2',
            encryptedKeys: [],
            createdAt: new Date('2024-01-02T00:00:00Z')
        });

        const res = await request(app)
            .get(`/api/chat/${league.id}?before=${msg1.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);

        // messages before msg1's timestamp — should be empty
        expect(res.body.length).toBe(0);
    });

    // --- Delete message ---

    test('DELETE /chat/:leagueId/:messageId — sender can delete (204)', async () => {
        const msg = await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'ciphertext==',
            nonce: 'nonce==',
            encryptedKeys: []
        });

        await request(app)
            .delete(`/api/chat/${league.id}/${msg.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(204);

        const found = await ChatMessage.findById(msg.id);
        expect(found).toBeNull();
    });

    test('DELETE /chat/:leagueId/:messageId — non-sender gets 403', async () => {
        const msg = await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'ciphertext==',
            nonce: 'nonce==',
            encryptedKeys: []
        });

        await request(app)
            .delete(`/api/chat/${league.id}/${msg.id}`)
            .set('Authorization', `Bearer ${member2Token}`)
            .expect(403);
    });

    // --- Image attachment ---

    test('POST /chat/:leagueId with image — stores encrypted image in DB', async () => {
        const fakeImageBuffer = Buffer.from('fakeimagebytes');

        const res = await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .field('ciphertext', 'ciphertext==')
            .field('nonce', 'nonce==')
            .field('imageNonce', 'imagenonce==')
            .field(
                'encryptedKeys',
                JSON.stringify([
                    { recipient: member2.id, encryptedMEK: 'mek==', ephemeralPublicKey: 'epk==' }
                ])
            )
            .field(
                'encryptedImageKeys',
                JSON.stringify([
                    { recipient: member2.id, encryptedMEK: 'imgmek==', ephemeralPublicKey: 'imgepk==' }
                ])
            )
            .attach('image', fakeImageBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' })
            .expect(201);

        expect(res.body.encryptedImage).toBeUndefined();
        expect(res.body.imageMimeType).toBe('image/jpeg');

        const stored = await ChatMessage.findById(res.body.id);
        expect(stored!.encryptedImage).toBeDefined();
    });

    test('GET /chat/:leagueId/:messageId/image — returns raw bytes', async () => {
        const fakeImageBuffer = Buffer.from('fakeimagebytes');
        const msg = await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'c',
            nonce: 'n',
            encryptedKeys: [],
            encryptedImage: fakeImageBuffer,
            imageMimeType: 'image/jpeg'
        });

        const res = await request(app)
            .get(`/api/chat/${league.id}/${msg.id}/image`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(200);

        expect(res.headers['content-type']).toMatch(/image\/jpeg/);
        expect(Buffer.from(res.body).toString()).toBe('fakeimagebytes');
    });

    test('GET /chat/:leagueId/:messageId/image — 404 if no image', async () => {
        const msg = await ChatMessage.create({
            league: league.id,
            sender: member1.id,
            ciphertext: 'c',
            nonce: 'n',
            encryptedKeys: []
        });

        await request(app)
            .get(`/api/chat/${league.id}/${msg.id}/image`)
            .set('Authorization', `Bearer ${memberToken}`)
            .expect(404);
    });

    // --- toJSON assertions ---

    test('response has id not _id, no __v, no encryptedImage', async () => {
        const payload = {
            ciphertext: 'c==',
            nonce: 'n==',
            encryptedKeys: [
                { recipient: member2.id, encryptedMEK: 'mek==', ephemeralPublicKey: 'epk==' }
            ]
        };

        const res = await request(app)
            .post(`/api/chat/${league.id}`)
            .set('Authorization', `Bearer ${memberToken}`)
            .send(payload)
            .expect(201);

        expect(res.body.id).toBeDefined();
        expect(res.body._id).toBeUndefined();
        expect(res.body.__v).toBeUndefined();
        expect(res.body.encryptedImage).toBeUndefined();
    });
});
