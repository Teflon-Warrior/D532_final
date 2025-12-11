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
//THIS SECTION WAS DEBUGGED BY CLAUDE
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
    const email = req.params.email;
    
    const collection = db.collection('users');
    const user = await collection.findOne({ email: email });
    
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

// Get media items with pagination
//THIS SECTION WAS DEBUGGED BY CLAUDE (Couldn't get pagination to work properly)
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