const { MongoClient, ServerApiVersion } = require('mongodb');

let client = null;
let db = null;

const buildMongoUriFromParts = () => {
  const host = process.env.MONGO_HOST;
  const username = process.env.MONGO_USERNAME;
  const password = process.env.MONGO_PASSWORD;
  const appName = process.env.MONGO_APP_NAME || 'SriVinayakaTenders';
  const authSource = process.env.MONGO_AUTH_SOURCE || 'admin';

  if (!host || !username || !password) return null;

  const encodedUser = encodeURIComponent(username);
  const encodedPass = encodeURIComponent(password);
  const params = new URLSearchParams({
    appName,
    retryWrites: 'true',
    w: 'majority',
    authSource,
  });

  return `mongodb+srv://${encodedUser}:${encodedPass}@${host}/?${params.toString()}`;
};

const getMongoClient = async () => {
  if (db) return db;

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || buildMongoUriFromParts();
  if (!uri) throw new Error('MongoDB URI is not configured. Set MONGODB_URI or MONGO_URI in .env');

  const options = {
    tls: true,
    tlsInsecure: false, // Set to true only if MongoDB cert validation fails (not recommended for production)
    retryWrites: true,
    w: 'majority',
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    maxPoolSize: 10,
    minPoolSize: 2,
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    family: 4, // Force IPv4
  };

  try {
    client = new MongoClient(uri, options);
    await client.connect();
    db = client.db(process.env.MONGO_DB_NAME || 'sri_vinayaka_backups');
    console.log('✅ MongoDB Atlas connected for backups');
    return db;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);

    // Give actionable hints for Atlas auth failures without exposing secrets.
    if (err && (err.codeName === 'AtlasError' || /bad auth/i.test(err.message))) {
      console.error('ℹ️ Check MongoDB credentials and authSource. If password has special chars, use component vars (MONGO_USERNAME/MONGO_PASSWORD/MONGO_HOST) to auto-encode.');
    }

    client = null;
    db = null;
    throw err;
  }
};

const closeMongoConnection = async () => {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
};

module.exports = { getMongoClient, closeMongoConnection };
