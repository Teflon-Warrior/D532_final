import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));  // serve your HTML files

// Connect to MongoDB
const client = new MongoClient(process.env.MONGO_URI);

async function start() {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(process.env.DB_NAME);
    const moviesCollection = db.collection('movies');

    // --- API Endpoint ---
    app.get('/api/movies', async (req, res) => {
        try {
            const movies = await moviesCollection.find().toArray();
            res.json(movies);
        } catch (err) {
            res.status(500).json({ error: 'Database query failed' });
        }
    });

    // Start the server
    app.listen(3000, () => {
        console.log("Server running on http://localhost:3000");
    });
}

start().catch(console.error);
