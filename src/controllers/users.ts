import { Request, Response } from 'express';
import { User, IUser } from '../models/User/User';
import { SALT_ROUNDS } from '../utils/config';
import { hash } from 'bcrypt';
import { MiddleWare } from 'src/common/interfaces/express';
import { ProfileVisibility } from '../common/enums/ProfileVisibility';
import { populateUser } from '../common/populate';

export const createUser = async (req: Request, res: Response) => {
    const { username, name, password, email, visibility } = req.body;
    if (!username || !name || !password || !email) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }
    if (visibility && !Object.values(ProfileVisibility).includes(visibility)) {
        res.status(400).json({ error: 'Invalid visibility parameter' });
        return;
    }
    const passwordHash = await hash(password, SALT_ROUNDS);
    const user = new User({ username, name, email, visibility, passwordHash });
    await user.save();
    res.status(201).json(user);
};

export const getOwnUser: MiddleWare = async (req, res, _) => {
    const user = req.user;

    if (!user) {
        res.status(404).send('User not found');
        return;
    }

    console.log(user);
    const response = await populateUser(user);
    res.status(200).json(response);
};

export const getUser: MiddleWare = async (req, res, _) => {
    const ownUser = req.user;
    const { username } = req.params;

    const userToGet = await User.findOne({ username });
    if (!ownUser || !userToGet) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (!userToGet.isVisibleTo(ownUser)) {
        const reason =
            userToGet.profileVisibility === ProfileVisibility.Private ? 'private' : 'not_friends';
        return res.status(200).json({ visible: false, username: userToGet.username, reason });
    }

    // Reload with avatar field before populating the rest
    const userWithAvatar = await User.findById(userToGet.id).select('+profilePicture +profilePictureContentType');
    const avatarBase64 = userWithAvatar?.profilePicture
        ? userWithAvatar.profilePicture.toString('base64')
        : null;

    const populated = await populateUser(userToGet);
    // Strip fields that should not be shared with other users
    const { email, friendRequests, ...publicData } = (populated as any).toJSON();
    return res.status(200).json({ visible: true, avatarBase64, ...publicData });
};

// remove later
export const getUsers: MiddleWare = async (_req, res, _) => {
    console.log('USER ROUTER: get users');
    const users = await User.find();

    const populatedUsers = await Promise.all(
        users.map(userDoc => populateUser(userDoc))
    );

    console.log('Users: ' + populatedUsers);
    res.status(201).json(populatedUsers);
};

export const updateUserVisibility: MiddleWare = async (req, res, _) => {
    let user = req.user;

    try {
        const { visibility } = req.body;
        if (!Object.values(ProfileVisibility).includes(visibility)) {
            throw new Error(
                `Invalid visibility value. Must be one of: ${Object.keys(ProfileVisibility).join(', ')}`
            );
        }

        user!.profileVisibility = visibility;
        await user!.save();
        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user visibility' });
    }
};

export const sendFriendRequest: MiddleWare = async (req, res) => {
    const ownUser = req.user;
    const { username } = req.params;

    if (!ownUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (ownUser.username === username) {
        return res.status(400).json({ error: 'Cannot send a friend request to yourself' });
    }

    const friend = await User.findOne({ username }).select('_id friendRequests friends');
    if (!friend) return res.status(404).json({ error: 'User not found' });

    if (friend.friendRequests.includes(ownUser.id) || friend.friends.includes(ownUser.id)) {
        return res.status(400).json({ error: 'Friend request already sent or already friends' });
    }

    friend.friendRequests.push(ownUser.id);
    await friend.save();

    res.status(200).json({ message: 'Friend request sent' });
};

export const acceptFriendRequest: MiddleWare = async (req, res) => {
    const ownUser = req.user;
    const { username } = req.params;

    if (!ownUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const friend = await User.findOne({ username }).select('_id friends');
    if (!friend) return res.status(404).json({ error: 'User not found' });

    if (!ownUser.friendRequests.includes(friend.id.toString())) {
        return res.status(400).json({ error: 'No friend request from this user' });
    }

    // Remove from requests and add to friends list
    ownUser.friendRequests = ownUser.friendRequests.filter(
        (id) => id.toString() !== friend.id.toString()
    );
    ownUser.friends.push(friend.id);
    friend.friends.push(ownUser.id);

    await Promise.all([ownUser.save(), friend.save()]);

    res.status(200).json({ message: 'Friend request accepted' });
};

export const rejectFriendRequest: MiddleWare = async (req, res) => {
    const ownUser = req.user;
    const { username } = req.params;

    if (!ownUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const friend = await User.findOne({ username }).select('_id');
    if (!friend) return res.status(404).json({ error: 'User not found' });

    ownUser.friendRequests = ownUser.friendRequests.filter(
        (id) => id.toString() !== friend.id.toString()
    );
    await ownUser.save();

    res.status(200).json({ message: 'Friend request rejected' });
};

export const removeFriend: MiddleWare = async (req, res) => {
    const ownUser = req.user;
    const { username } = req.params;

    if (!ownUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const friend = await User.findOne({ username }).select('_id friends');
    if (!friend) return res.status(404).json({ error: 'User not found' });

    ownUser.friends = ownUser.friends.filter((id) => id.toString() !== friend.id.toString());
    friend.friends = friend.friends.filter((id) => id.toString() !== ownUser.id.toString());

    await Promise.all([ownUser.save(), friend.save()]);

    res.status(200).json({ message: 'Friend removed' });
};
