import { MongoClient, ServerApiVersion } from "mongodb";

let db;
let client;

const connectDB = async () => {
  client = new MongoClient(process.env.MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    // Connect the client to the server
    await client.connect();
    db = client.db("x-database");
  } finally {
  }
};

const getDB = () => {
  if (!db) throw new Error("DB is not initialize on configuration file.");
  return db;
};

export { connectDB, getDB, client };
