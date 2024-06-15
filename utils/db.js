// Import MongoClient from mongodb

import { MongoClient } from 'mongodb';

// Define a function to connect to the database
class DBClient {
    constructor() {
        // Get environment variables
        const host = process.env.DB_HOST || 'localhost';
        const port = process.env.DB_PORT || 27017;
        const database = process.env.DB_DATABASE || 'files_manager';

        // Create the URL connection
        const url = `mongodb://${host}:${port}`;

        // Create a new MongoClient
        this.client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });

        // Connect to db
        this.client.connect()
            .then(() => console.log('Connected successfully to MongoDB server'))
            .catch((err) => console.log(err));

        // Select the database
        this.db = this.client.db(database);
    }

    // Check if the Mongodb connection is active
    isAlive() {
        return this.client.isConnected();
    }

    // Get no of users via Asyncronous method
    async nbUsers() {
        return this.db.collection('users').countDocuments();
    }

    // Get no of files via Asyncronous method
    async nbFiles() {
        return this.db.collection('files').countDocuments();
    }
}

    // Create and export the DBClient instance
    const dbClient = new DBClient();
    export default dbClient;
    