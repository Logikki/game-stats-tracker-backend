import { Request, Response } from 'express';
import { User } from '../models/User/User';
import { MiddleWare } from '../common/interfaces/express';

export const getAvatar = async (req: Request, res: Response) => {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('profilePicture profilePictureContentType');

    if (!user?.profilePicture) {
        res.status(404).json({ message: 'No avatar' });
        return;
    }

    res.set('Content-Type', user.profilePictureContentType ?? 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(user.profilePicture);
};

export const uploadAvatar: MiddleWare = async (req, res, _) => {
    const user = req.user;

    if (!user || !req.file) {
        res.status(400).json({ message: 'Missing file' });
        return;
    }

    user.profilePicture = req.file.buffer;
    user.profilePictureContentType = req.file.mimetype;
    await user.save();

    res.status(200).json({ message: 'Avatar updated' });
};

export const deleteAvatar: MiddleWare = async (req, res, _) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
    }

    user.profilePicture = undefined;
    user.profilePictureContentType = undefined;
    await user.save();

    res.status(204).end();
};
