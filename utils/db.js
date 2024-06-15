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

}