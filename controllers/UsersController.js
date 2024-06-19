// Importing required modules
import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import DBClient from '../utils/db';
import redisClient from '../utils/redis';

// Define the UsersController class to handle user-related endpoints
class UsersController {
  // Static method to handle user registration
  static async postNew(req, res) {
    // Get the user's email and password from the request body
    const { email, password } = req.body;

    // Check if the user's email or password are missing
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    try {
      // Check if the user already exists
      const userExists = await DBClient.db.collection('users').findOne({ email });
      if (userExists) return res.status(400).send({ error: 'Already exist' });

      // Create a new user with the provided email and hashed password
      const user = await DBClient.db.collection('users').insertOne({
        email,
        password: sha1(password),
      });

      // Return the new user's ID and email
      return res.status(201).send({
        id: user.insertedId,
        email,
      });
    } catch (err) {
      // Log any errors to the console and respond with 500 Server Error
      console.error(err);
      return res.status(500).send({ error: 'Server error' });
    }
  }

  // Static method to retrieve the authenticated user's information
  static async getMe(req, res) {
    // Retrieve the token from the X-Token header
    const token = req.header('X-Token');
    if (!token) {
      // If no token is provided, respond with 401 Unauthorized
      return res.status(401).send({ error: 'Unauthorized' });
    }

    try {
      // Create the Redis key for the token and retrieve the user ID
      const tokenKey = `auth_${token}`;
      const userId = await redisClient.get(tokenKey);
      if (!userId) {
        // If no user ID is found, respond with 401 Unauthorized
        return res.status(401).send({ error: 'Unauthorized' });
      }

      // Find the user in the database by their ID
      const user = await DBClient.db.collection('users').findOne({ _id: ObjectId(userId) });
      if (!user) {
        // If no user is found, respond with 401 Unauthorized
        return res.status(401).send({ error: 'Unauthorized' });
      }

      // Return the user's ID and email
      return res.status(200).send({ id: user._id, email: user.email });
    } catch (err) {
      // Log any errors to the console and respond with 500 Server Error
      console.error(err);
      return res.status(500).send({ error: 'Server error' });
    }
  }
}

// Export the UsersController class for use in other files
module.exports = UsersController;
