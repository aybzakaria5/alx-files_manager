// Description: This file contains the logic for handling requests from the users route.
// imports sha1 from the sha1 package & dbclient from the utils/db file
// & ObjectId from the mongodb package & redisClient from utils/redis file
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import DBClient from '../utils/db';
import RedisClient from '../utils/redis';

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
}

export default UsersController;