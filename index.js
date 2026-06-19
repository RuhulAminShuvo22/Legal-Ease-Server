const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion } = require("mongodb");
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MONGODB CONNECTION URI
const uri =process.env.MONGODB_URI;

// MONGODB CLIENT
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// DATABASE CONNECTION
async function run() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log(
      "✅ Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    await client.close();
  }
}

run().catch(console.dir);

// DEFAULT ROUTE
app.get("/", (req, res) => {
  res.send("🚀 Legal-Ease Server is running fine!");
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
