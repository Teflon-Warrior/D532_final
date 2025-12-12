//import packages to connect to MongoDB and connect to server
import 'dotenv/config';
import express from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

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

//establish connection
connectDB();


// Login API endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('Login attempt for:', username);
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username and password are required' 
      });
    }
    
    const collection = db.collection('users');
    
    // Find user by email (username is their email)
    const user = await collection.findOne({ email: username });
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid username or password' 
      });
    }
    
    // For demonstration accept any password
    
    console.log('Login successful for:', user.name);
    
    // Return user information (excluding sensitive data)
    res.json({
      success: true,
      userId: user.userId,
      username: user.name,
      email: user.email,
      age: user.age,
      favorite_genres: user.favorite_genres,
      token: 'demo_token_' + user.userId
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// Verify token/session endpoint
//THIS SECTION WAS DEBUGGED BY CLAUDE
app.post('/api/verify', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and token required' 
      });
    }
    
    const collection = db.collection('users');
    const user = await collection.findOne({ email: email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    

    // just check if token exists and return data
    if (token.startsWith('demo_token_') || token.length > 100) {
      res.json({
        success: true,
        valid: true,
        user: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          age: user.age,
          favorite_genres: user.favorite_genres
        }
      });
    } else {
      res.status(401).json({
        success: false,
        valid: false,
        message: 'Invalid token'
      });
    }
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during verification' 
    });
  }
});

// Get user profile by email
app.get('/api/user/:email', async (req, res) => {
  try {
    const identifier = req.params.email; // can be email or userId
    
    const collection = db.collection('users');
    const numericId = parseInt(identifier, 10);
    const user = await collection.findOne({
      $or: [
        { email: identifier },
        { userId: identifier },
        (!Number.isNaN(numericId) ? { userId: numericId } : null)
      ].filter(Boolean)
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Return user data (excluding sensitive info)
    res.json({
      success: true,
      userId: user.userId,
      name: user.name,
      email: user.email,
      age: user.age,
      favorite_genres: user.favorite_genres
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Get recommendations for a user
app.get('/api/user/:email/recommendations', async (req, res) => {
  try {
    const identifier = req.params.email; // can be email or userId

    if (!db) {
      return res.status(503).json({
        success: false,
        message: 'Database not initialized yet'
      });
    }

    const users = db.collection('users');
    const media = db.collection('media');
    const recommendations = db.collection('recommendations');

    // Find the user first to derive their identifiers and preferences
    const numericId = parseInt(identifier, 10);
    const user = await users.findOne({
      $or: [
        { email: identifier },
        { userId: identifier },
        (!Number.isNaN(numericId) ? { userId: numericId } : null)
      ].filter(Boolean)
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Try to load explicit recommendations stored for this user.
    // Current schema example:
    // { recId, userId, generated_at, movie_list: ['s34', ...] }
    const explicitRec = await recommendations.findOne({
      $or: [
        { userId: user.userId },
        { email: user.email }
      ]
    });

    const recIdsRaw = Array.isArray(explicitRec?.movie_list)
      ? explicitRec.movie_list
      : Array.isArray(explicitRec?.mediaIds)
        ? explicitRec.mediaIds
        : Array.isArray(explicitRec?.media_ids)
          ? explicitRec.media_ids
          : Array.isArray(explicitRec?.recommendations)
            ? explicitRec.recommendations
            : [];

    const recIds = recIdsRaw.map(id => String(id));
    const recIdNums = recIds
      .map(id => parseInt(String(id).replace(/\D+/g, ''), 10))
      .filter(n => !Number.isNaN(n));

    let recItems = [];

    if (recIds.length > 0) {
      // Fetch the referenced media items; support string or numeric ids
      recItems = await media
        .find({
          $or: [
            { media_id: { $in: recIds } },
            { media_id: { $in: recIdNums } },
            { id: { $in: recIdNums } }
          ]
        })
        .limit(20)
        .toArray();
    }

    // Fallback: if no explicit recs or none matched, use favorite genres
    if (recItems.length === 0 && Array.isArray(user.favorite_genres) && user.favorite_genres.length > 0) {
      recItems = await media
        .find({ genre: { $in: user.favorite_genres } })
        .sort({ rating: -1 })
        .limit(20)
        .toArray();
    }

    // Final fallback: top-rated overall if still empty
    if (recItems.length === 0) {
      recItems = await media
        .find({})
        .sort({ rating: -1 })
        .limit(12)
        .toArray();
    }

    console.log(`Recommendations -> user ${user.email}, ids requested: ${recIds.length}, numeric ids: ${recIdNums.length}, items returned: ${recItems.length}`);

    res.json({
      success: true,
      userId: user.userId,
      email: user.email,
      recommendations: recItems
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching recommendations'
    });
  }
});

// Get a single recommendation for a user (one item)
app.get('/api/user/:email/recommendation', async (req, res) => {
  try {
    const identifier = req.params.email; // can be email or userId

    if (!db) {
      return res.status(503).json({ success: false, message: 'Database not initialized yet' });
    }

    const users = db.collection('users');
    const media = db.collection('media');
    const recommendations = db.collection('recommendations');

    const numericId = parseInt(identifier, 10);
    const user = await users.findOne({
      $or: [
        { email: identifier },
        { userId: identifier },
        (!Number.isNaN(numericId) ? { userId: numericId } : null)
      ].filter(Boolean)
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Use aggregation to retrieve one recommended item via movie_list -> media lookup
    const pipeline = [
      { $match: { userId: user.userId } },
      { $unwind: '$movie_list' },
      {
        $lookup: {
          from: 'media',
          localField: 'movie_list',
          foreignField: 'media_id',
          as: 'movie_info'
        }
      },
      { $unwind: '$movie_info' },
      {
        $project: {
          _id: 0,
          media_id: '$movie_info.media_id',
          title: '$movie_info.title',
          genre: '$movie_info.genre',
          type: '$movie_info.type',
          description: '$movie_info.description',
          rating: '$movie_info.rating',
          duration: '$movie_info.duration'
        }
      },
      { $limit: 1 }
    ];

    const aggRes = await recommendations.aggregate(pipeline).toArray();
    let item = aggRes[0] || null;

    // Fallbacks if no explicit recommendation matched
    if (!item && Array.isArray(user.favorite_genres) && user.favorite_genres.length > 0) {
      item = await media.findOne({ genre: { $in: user.favorite_genres } }, { sort: { rating: -1 } });
    }
    if (!item) {
      item = await media.findOne({}, { sort: { rating: -1 } });
    }

    res.json({ success: true, recommendation: item });
  } catch (error) {
    console.error('Single recommendation error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching single recommendation' });
  }
});

// Get media items with pagination
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