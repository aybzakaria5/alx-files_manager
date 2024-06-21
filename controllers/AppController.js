const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static async getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: await dbClient.isAlive(),
    });
  }

  static async getStats(req, res) {
    const usersNum = await dbClient.nbUsers();
    const filesNum = await dbClient.nbFiles();
    res.status(200).json({ users: usersNum, files: filesNum });
  }
}

module.exports = AppController;
