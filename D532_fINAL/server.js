import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
const client = new MongoClient(process.env.MONGODB_URI);
let db;

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    db = client.db('netflix_db');
    
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database name:', db.databaseName);
    
    const collections = await db.listCollections().toArray();
    console.log('📂 Collections in database:', collections.map(c => c.name));
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
}

connectDB();

// ⭐ API ROUTES FIRST - Define API routes BEFORE static files
app.get('/api/items', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const collection = db.collection('media');
    
    const items = await collection.find({}).skip(skip).limit(limit).toArray();
    const totalItems = await collection.countDocuments();
    const totalPages = Math.ceil(totalItems / limit);
    
    res.json({
      items: items,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ⭐ STATIC FILES LAST - Serve static files AFTER all API routes
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});