// lib/mongodb.js
// MongoDB client utility for Next.js.
// Exports a singleton MongoClient promise to reuse the database connection
// across all API routes, preventing connection exhaustion in serverless environments.

import { MongoClient } from "mongodb";
import { setServers } from "dns";

// Use Google DNS servers to avoid connection issues in some network environments
setServers(["8.8.8.8", "8.8.4.4"]);

// MongoDB connection string loaded from environment variable
const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

// Ensure the MONGODB_URI environment variable is set before proceeding
if (!process.env.MONGODB_URI) {
  throw new Error("Please add your MongoDB URI to .env.local");
}

if (process.env.NODE_ENV === "development") {
  // In development, reuse the existing connection across hot reloads
  // by storing it on the global object to prevent multiple connections
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In production (Vercel), create a new connection per serverless function instance
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

// Export the client promise to be used in API route handlers
export default clientPromise;
