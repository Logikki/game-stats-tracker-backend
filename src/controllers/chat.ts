import { Response } from 'express';
import { TrackerApiRequest, MiddleWare } from '../common/interfaces/express';
import { ChatMessage } from '../models/chat/ChatMessage';
import { UserPublicKey } from '../models/chat/UserPublicKey';
import { broadcastToLeague } from '../utils/websocket';

export const registerPublicKey: MiddleWare = async (req, res) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const { publicKey, algorithm } = req.body;
    if (!publicKey) {
        res.status(400).json({ error: 'Missing publicKey' });
        return;
    }

    const keyDoc = await UserPublicKey.findOneAndUpdate(
        { user: user.id },
        { user: user.id, publicKey, algorithm: algorithm ?? 'x25519' },
        { upsert: true, new: true }
    );

    res.status(200).json(keyDoc);
};

export const getLeaguePublicKeys: MiddleWare = async (req, res) => {
    const league = req.league;
    if (!league) {
        res.status(404).json({ error: 'League not found' });
        return;
    }

    const keys = await UserPublicKey.find({ user: { $in: league.users } });
    res.status(200).json(keys);
};

export const getMessages: MiddleWare = async (req, res) => {
    const { leagueId } = req.params;
    const { before, limit } = req.query;

    const pageLimit = Math.min(parseInt(String(limit ?? '50'), 10) || 50, 100);

    let query: Record<string, any> = { league: leagueId };

    if (before) {
        const pivot = await ChatMessage.findById(before);
        if (pivot) {
            query.createdAt = { $lt: pivot.createdAt };
        }
    }

    const messages = await ChatMessage.find(query)
        .sort({ createdAt: -1 })
        .limit(pageLimit)
        .populate('sender', 'id username');

    res.status(200).json(messages);
};

export const sendMessage: MiddleWare = async (req, res) => {
    const user = req.user;
    const league = req.league;
    if (!user || !league) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    let { ciphertext, nonce, encryptedKeys, imageNonce, encryptedImageKeys } = req.body;

    if (!ciphertext || !nonce || !encryptedKeys) {
        res.status(400).json({ error: 'Missing required fields: ciphertext, nonce, encryptedKeys' });
        return;
    }

    if (typeof encryptedKeys === 'string') {
        try {
            encryptedKeys = JSON.parse(encryptedKeys);
        } catch {
            res.status(400).json({ error: 'Invalid encryptedKeys format' });
            return;
        }
    }

    if (encryptedImageKeys && typeof encryptedImageKeys === 'string') {
        try {
            encryptedImageKeys = JSON.parse(encryptedImageKeys);
        } catch {
            res.status(400).json({ error: 'Invalid encryptedImageKeys format' });
            return;
        }
    }

    const messageData: Record<string, any> = {
        league: league.id,
        sender: user.id,
        ciphertext,
        nonce,
        encryptedKeys
    };

    if (req.file) {
        messageData.encryptedImage = req.file.buffer;
        messageData.imageMimeType = req.file.mimetype;
        messageData.imageNonce = imageNonce;
        messageData.encryptedImageKeys = encryptedImageKeys ?? [];
    }

    const message = new ChatMessage(messageData);
    await message.save();
    await message.populate('sender', 'id username');

    broadcastToLeague(league.id, { type: 'new_message', data: message.toJSON() });

    res.status(201).json(message);
};

export const deleteMessage: MiddleWare = async (req, res) => {
    const user = req.user;
    const { messageId } = req.params;

    if (!user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const message = await ChatMessage.findById(messageId);
    if (!message) {
        res.status(404).json({ error: 'Message not found' });
        return;
    }

    if (!message.sender.equals(user.id)) {
        res.status(403).json({ error: 'Cannot delete another user\'s message' });
        return;
    }

    await message.deleteOne();
    res.status(204).end();
};

export const getMessageImage: MiddleWare = async (req, res) => {
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId).select(
        'encryptedImage imageMimeType league'
    );

    if (!message?.encryptedImage) {
        res.status(404).json({ error: 'No image for this message' });
        return;
    }

    res.set('Content-Type', message.imageMimeType ?? 'application/octet-stream');
    res.send(message.encryptedImage);
};
