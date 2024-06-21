const { MongoClient } = require('mongodb');

const HOST = process.env.DB_HOST || 'localhost';
const PORT = process.env.DB_PORT || 27017;
const DATABASE = process.env.DB_DATABASE || 'files_manager';

const url = `mongodb://${HOST}:${PORT}`;

class DBClient {
  constructor() {
    this.client = new MongoClient(url, { useUnifiedTopology: true, useNewUrlParser: true });
    this.connected = false;
    this.client.connect().then(() => {
      this.db = this.client.db(DATABASE);
      this.connected = true;
      console.log('DB client connected to the server');
    }).catch((err) => {
      console.error(`DB client not connected to the server: ${err.message}`);
    });
  }

  isAlive() {
    return this.connected;
  }

  async nbUsers() {
    if (!this.connected) {
      throw new Error('DB client not connected');
    }
    const users = this.db.collection('users');
    const usersNum = await users.countDocuments();
    return usersNum;
  }

  async nbFiles() {
    if (!this.connected) {
      throw new Error('DB client not connected');
    }
    const files = this.db.collection('files');
    const filesNum = await files.countDocuments();
    return filesNum;
  }
}

const dbClient = new DBClient();
module.exports = dbClient;
