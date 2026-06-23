const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

// MIDDLEWARE

app.use(
  cors({
    origin: ["http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

// MONGODB URI

const uri = process.env.MONGODB_URI;

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

    console.log("✅ MongoDB Connected");

    const db = client.db("legalease");

    const usersCollection = db.collection("users");
    const lawyersCollection = db.collection("lawyers");
    const hiringsCollection = db.collection("hirings");
    const consultationsCollection = db.collection("consultations");
    const reviewsCollection = db.collection("reviews");

    // =====================================================
    // CREATE USER
    // =====================================================

    app.post("/users", async (req, res) => {
      try {
        const user = req.body;

        if (!user.email) {
          return res.status(400).json({
            success: false,
            message: "Email is required",
          });
        }

        const existingUser = await usersCollection.findOne({
          email: user.email,
        });

        if (existingUser) {
          return res.status(200).json({
            success: true,
            message: "User already exists",
            user: existingUser,
          });
        }

        const newUser = {
          name: user.name || "",
          email: user.email,
          image: user.image || "",
          role: user.role || "client",
          createdAt: new Date(),
        };

        const result = await usersCollection.insertOne(newUser);

        res.status(201).json({
          success: true,
          insertedId: result.insertedId,
          user: newUser,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // GET ALL USERS

    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection
          .find()
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(users);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // CHECK USER EXISTS

    app.get("/users/email/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await usersCollection.findOne({
          email,
        });

        res.send({
          success: true,
          exists: !!user,
          user,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // GET USER BY EMAIL
    app.get("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const user = await usersCollection.findOne({
          email,
        });

        res.send(user);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // UPDATE USER ROLE
    app.patch("/users/role/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const { role } = req.body;

        const validRoles = ["client", "lawyer", "admin"];

        if (!validRoles.includes(role)) {
          return res.status(400).json({
            success: false,
            message: "Invalid role",
          });
        }

        const result = await usersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              role,
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // DELETE USER

    app.delete("/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    // UPDATE USER PROFILE

    app.put("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const { name, image, phone, address, bio } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              name,
              image,
              phone,
              address,
              bio,
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // =====================================================
    // LAWYER ROUTES
    // =====================================================
    app.get("/lawyers/email/:email", async (req, res) => {
      const email = req.params.email;

      const result = await lawyersCollection.findOne({
        lawyerEmail: email,
      });

      res.send(result);
    });

    // GET ALL LAWYERS

    app.get("/lawyers", async (req, res) => {
      try {
        const lawyers = await lawyersCollection.find().toArray();

        res.send(lawyers);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to fetch lawyers",
        });
      }
    });

    // GET SINGLE LAWYER

    app.get("/lawyers/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const lawyer = await lawyersCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!lawyer) {
          return res.status(404).json({
            success: false,
            message: "Lawyer not found",
          });
        }

        res.send(lawyer);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Lawyer not found",
        });
      }
    });

    // ADD LAWYER

    app.post("/lawyers", async (req, res) => {
      try {
        const lawyer = req.body;

        const result = await lawyersCollection.insertOne(lawyer);

        res.status(201).json({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Failed to add lawyer",
        });
      }
    });

    // UPDATE LAWYER

    app.put("/lawyers/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const updatedLawyer = req.body;

        const result = await lawyersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: updatedLawyer,
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Update failed",
        });
      }
    });

    // DELETE LAWYER//

    app.delete("/lawyers/:id", async (req, res) => {
      try {
        const { id } = req.params;

        const result = await lawyersCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Delete failed",
        });
      }
    });
    //latest 6 lawyers
    app.get("/lawyers/latest", async (req, res) => {
      const lawyers = await lawyersCollection
        .find()
        .sort({ _id: -1 })
        .limit(6)
        .toArray();

      res.send(lawyers);
    });
    // ===========================
    // CREATE HIRING REQUEST
    // ===========================

    app.post("/hirings", async (req, res) => {
      try {
        const hiring = req.body;

        const result = await hiringsCollection.insertOne({
          ...hiring,
          createdAt: new Date(),
        });

        res.send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // CLIENT HIRING HISTORY
    // ===========================

    app.get("/hirings/client/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await hiringsCollection
          .find({
            clientEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // LAWYER REQUESTS
    // ===========================

    app.get("/hirings/lawyer/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await hiringsCollection
          .find({
            lawyerEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // ACCEPT REQUEST
    // ===========================

    app.patch("/hirings/accept/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "accepted",
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // REJECT REQUEST
    // ===========================

    app.patch("/hirings/reject/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              status: "rejected",
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // GET SINGLE HIRING
    // ===========================

    app.get("/hirings/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // CHECK CONSULTATION ELIGIBILITY//
    app.get("/hirings/check/:lawyerId/:clientEmail", async (req, res) => {
      try {
        const { lawyerId, clientEmail } = req.params;

        const hiring = await hiringsCollection.findOne({
          lawyerId,
          clientEmail,
          status: "accepted",
          paymentStatus: "paid",
        });

        res.send({
          success: true,
          exists: !!hiring,
          hiring,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // ===========================
    // CREATE STRIPE PAYMENT INTENT
    // ===========================
    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { fee } = req.body;

        const paymentIntent = await stripe.paymentIntents.create({
          amount: fee * 100,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // ===========================
    // PAYMENT SUCCESS
    // ===========================

    app.patch("/hirings/payment/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await hiringsCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              paymentStatus: "paid",
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // ===========================
    // CREATE CONSULTATION
    // ===========================

    app.post("/consultations", async (req, res) => {
      try {
        const consultation = req.body;

        const result = await consultationsCollection.insertOne({
          ...consultation,
          status: "scheduled",
          createdAt: new Date(),
        });

        res.send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // CLIENT CONSULTATIONS
    // ===========================

    app.get("/consultations/client/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await consultationsCollection
          .find({
            clientEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // LAWYER CONSULTATIONS
    // ===========================

    app.get("/consultations/lawyer/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await consultationsCollection
          .find({
            lawyerEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // SINGLE CONSULTATION
    // ===========================

    app.get("/consultations/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await consultationsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // COMPLETE CONSULTATION
    app.patch("/consultations/complete/:id", async (req, res) => {
      try {
        const result = await consultationsCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: {
              status: "completed",
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });

    // CANCEL CONSULTATION
    app.patch("/consultations/cancel/:id", async (req, res) => {
      try {
        const result = await consultationsCollection.updateOne(
          {
            _id: new ObjectId(req.params.id),
          },
          {
            $set: {
              status: "cancelled",
            },
          },
        );

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // CREATE REVIEW
    // ===========================

    app.post("/reviews", async (req, res) => {
      try {
        const review = req.body;

        const result = await reviewsCollection.insertOne({
          ...review,
          createdAt: new Date(),
        });

        res.send({
          success: true,
          insertedId: result.insertedId,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // CLIENT REVIEWS
    // ===========================

    app.get("/reviews/client/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await reviewsCollection
          .find({
            clientEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // LAWYER REVIEWS
    // ===========================

    app.get("/reviews/lawyer/:email", async (req, res) => {
      try {
        const email = req.params.email;

        const result = await reviewsCollection
          .find({
            lawyerEmail: email,
          })
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // SINGLE REVIEW
    // ===========================

    app.get("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await reviewsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.send(result);
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // ===========================
    // DELETE REVIEW
    // ===========================

    app.delete("/reviews/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const result = await reviewsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.send({
          success: true,
          result,
        });
      } catch (error) {
        res.status(500).send({
          success: false,
          message: error.message,
        });
      }
    });
    // PING TEST

    await client.db("admin").command({
      ping: 1,
    });

    console.log("✅ Successfully connected to MongoDB!");
  } catch (error) {
    console.error(error);
  }
}

run();

// ROOT ROUTE

app.get("/", (req, res) => {
  res.send("🚀 LegalEase Server Running Successfully!");
});

// START SERVER

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
