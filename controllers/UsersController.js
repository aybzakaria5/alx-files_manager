import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import DBClient from '../utils/db';
import redisClient from '../utils/redis';

class UsersController {
  static async postNew(req, res) {
    // Get the user's email and password from the request body
    const { email, password } = req.body;

    // Check if the user's email or password are missing
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    // Check if the user already exists
    const userExists = await DBClient.db.collection('users').findOne({ email });
    if (userExists) return res.status(400).send({ error: 'Already exist' });

    // Create a new user
    const user = await DBClient.db.collection('users').insertOne({
      email,
      password: sha1(password),
    });

    // Return the new user
    return res.status(201).send({
      id: user.insertedId,
      email,
    });
  }

  static async getMe(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const tokenKey = `auth_${token}`;
    const userId = await redisClient.get(tokenKey);
    if (!userId) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).send({ error: 'Unauthorized' });
    }

    return res.status(200).send({ id: user._id, email: user.email });
  }
}

export default UsersController;
