// D532 Final Project Mongo Script
// Luke, Sahil & Manish



// Select / create database
use netflix_db;

// Creating collections only if not already created
if (!db.getCollectionNames().includes("users")) {
  db.createCollection("users");
}
if (!db.getCollectionNames().includes("media")) {
  db.createCollection("media");
}
if (!db.getCollectionNames().includes("ratings")) {
  db.createCollection("ratings");
}
if (!db.getCollectionNames().includes("recommendations")) {
  db.createCollection("recommendations");
}

// Upsert sample media
db.media.updateOne(
  { media_id: "s1" },
  {
    $set: {
      type: "Movie",
      title: "Dick Johnson Is Dead",
      director: "Kirsten Johnson",
      cast: [],
      country: "United States",
      release_year: 2020,
      rating: "PG-13",
      duration: "90 min",
      genre: ["Documentaries"],
      description: "As her father nears the end of his life..."
    }
  },
  { upsert: true }
);

// Upsert users
db.users.updateOne(
  { userId: 1001 },
  {
    $set: {
      email: "sahil@example.com",
      name: "Sahil Ravula",
      age: 21,
      favorite_genres: ["Documentaries", "Thriller"]
    }
  },
  { upsert: true }
);

db.users.updateOne(
  { userId: 1002 },
  {
    $set: {
      email: "luke@example.com",
      name: "Luke Harris",
      age: 22,
      favorite_genres: ["Comedy"]
    }
  },
  { upsert: true }
);

db.users.updateOne(
  { userId: 1003 },
  {
    $set: {
      email: "manish@example.com",
      name: "Manish Maudgalya",
      age: 22,
      favorite_genres: ["Comedy"]
    }
  },
  { upsert: true }
);

// Upsert ratings
db.ratings.updateOne(
  { userId: 1001, media_id: "s1" },
  {
    $set: {
      user_rating: 5,
      rated_at: new Date()
    }
  },
  { upsert: true }
);

// Upsert recommendations
db.recommendations.updateOne(
  { recId: 9001 },
  {
    $set: {
      userId: 1001,
      movie_list: ["s1", "s2", "s3"],
      generated_at: new Date()
    }
  },
  { upsert: true }
);

// Basic CRUD examples
db.media.find({ genre: "Documentaries" });
db.users.find();
db.ratings.find({ userId: 1001 });

db.users.updateOne(
  { userId: 1001 },
  { $set: { favorite_genres: ["Thriller", "Documentaries", "Action"] }}
);

db.ratings.deleteOne({ userId: 1001, media_id: "s1" });

// Lookup join: ratings → media
db.ratings.aggregate([
  { $match: { userId: 1001 }},
  {
    $lookup: {
      from: "media",
      localField: "media_id",
      foreignField: "media_id",
      as: "movie_info"
    }
  },
  { $unwind: "$movie_info" }
]);

// Expand recommendations into movie details
db.recommendations.aggregate([
  { $match: { userId: 1001 }},
  { $unwind: "$movie_list" },
  {
    $lookup: {
      from: "media",
      localField: "movie_list",
      foreignField: "media_id",
      as: "movie_info"
    }
  },
  { $unwind: "$movie_info" }
]);

// Analytics: most common genres
db.media.aggregate([
  { $unwind: "$genre" },
  { $group: { _id: "$genre", count: { $sum: 1 } }},
  { $sort: { count: -1 }}
]);

// Analytics: top rated movies
db.ratings.aggregate([
  { $lookup: { from: "media", localField: "media_id", foreignField: "media_id", as: "movie" }},
  { $unwind: "$movie" },
  { $group: { _id: "$movie.title", avg_rating: { $avg: "$user_rating" }, rating_count: { $sum: 1 } }},
  { $sort: { avg_rating: -1, rating_count: -1 }}
]);

// Analytics: user genre preference
db.ratings.aggregate([
  { $match: { userId: 1001 }},
  { $lookup: { from: "media", localField: "media_id", foreignField: "media_id", as: "movie" }},
  { $unwind: "$movie" },
  { $unwind: "$movie.genre" },
  { $group: { _id: "$movie.genre", times_rated: { $sum: 1 } }},
  { $sort: { times_rated: -1 }}
]);

// Analytics: recommendation list quality
db.recommendations.aggregate([
  { $match: { userId: 1001 }},
  { $unwind: "$movie_list" },
  { $lookup: { from: "media", localField: "movie_list", foreignField: "media_id", as: "movie_info" }},
  { $unwind: "$movie_info" },
  { $project: { _id: 0, recommended_title: "$movie_info.title", genre: "$movie_info.genre" }}
]);

// Indexes for performance
db.media.createIndex({ media_id: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ userId: 1 }, { unique: true });
db.ratings.createIndex({ userId: 1, media_id: 1 }, { unique: true });
db.recommendations.createIndex({ userId: 1 });
