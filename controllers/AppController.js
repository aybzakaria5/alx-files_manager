const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  static async getStatus(request, response) {
    response.status(200).json({
      redis: redisClient.isAlive(),
      db: await dbClient.isAlive(),
});
  }

  static async getStats(request, response) {
    const usersNum = await dbClient.nbUsers();
    const filesNum = await dbClient.nbFiles();
    response.status(200).json({ users: usersNum, files: filesNum });
  }
}

module.exports = AppController;
