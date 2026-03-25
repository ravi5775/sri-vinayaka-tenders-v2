const { MongoClient } = require('mongodb');

let client = null;
let db = null;

const getMongoClient = async () => {
  if (db) return db;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MongoDB URI is not configured. Set MONGODB_URI or MONGO_URI in .env');

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGO_DB_NAME || 'sri_vinayaka_backups');
  console.log('✅ MongoDB Atlas connected for backups');
  return db;
};

const closeMongoConnection = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};

module.exports = { getMongoClient, closeMongoConnection };
