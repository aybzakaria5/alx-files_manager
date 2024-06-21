// Importing required modules
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

// Define the AuthController class to handle authentication-related endpoints
class AuthController {
  // Static method to handle user connection (login)
  static async getConnect(req, res) {
    // Retrieve the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      // If no Authorization header is provided, respond with 401 Unauthorized
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      // Decode the base64-encoded email:password pair from the Authorization header
      const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
      const email = auth[0];
      const password = sha1(auth[1]);

      // Find the user in the database by email
      const user = await dbClient.db.collection('users').findOne({ email });
      // If no user is found or the password does not match, respond with 401 Unauthorized
      if (!user || password !== user.password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Generate a new UUID token for the session
      const token = uuidv4();
      // Create a Redis key for storing the user's session information
      const key = `auth_${token}`;
      const duration = 60 * 60 * 24; // Session duration is 24 hours

      // Store the user's ID in Redis with the generated token as the key
      await redisClient.set(key, user._id.toString(), duration);

      // Respond with the generated token
      return res.status(200).json({ token });
    } catch (err) {
      // Log any errors to the console and respond with 500 Server Error
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }

  // Static method to handle user disconnection (logout)
  static async getDisconnect(req, res) {
    try {
      // Retrieve the token from the X-Token header
      const token = req.header('X-Token');
      // Retrieve the user's ID from Redis using the token
      const userId = await redisClient.get(`auth_${token}`);
      // If no user ID is found, respond with 401 Unauthorized
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Delete the user's session from Redis
      await redisClient.del(`auth_${token}`);
      // Respond with 204 No Content to indicate successful logout
      return res.status(204).send();
    } catch (err) {
      // Log any errors to the console and respond with 500 Server Error
      console.error(err);
      return res.status(500).json({ error: 'Server error' });
    }
  }
}

// Export the AuthController class for use in other files
module.exports = AuthController;
