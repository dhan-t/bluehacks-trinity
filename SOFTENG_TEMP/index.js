import express from "express";
import cors from "cors";
import { connect } from "./connect.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { generatePDF } from "./pdfGenerator.js";
import notificationsRouter from "../routes/notifications.js";
import nodemailer from "nodemailer";
import { authenticateToken } from "../middleware/auth.js";
import { ObjectId } from "mongodb";

dotenv.config({ path: "./config.env" });

const app = express();

app.use(express.json());
app.use(cors());

// Convert import.meta.url to __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

app.use("/uploads", express.static(uploadsDir)); // Serve static files from the uploads directory

app.use("/api/notifications", notificationsRouter);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

connect()
  .then((client) => {
    const db = client.db("analog");
    app.locals.db = db;

    console.log("Connected to the database!");

    // Helper function to create a notification
    const createNotification = async (message) => {
      const collection = db.collection("notifications");
      await collection.insertOne({
        message,
        createdAt: new Date(),
      });
    };

    // Register User
    app.post("/api/register", async (req, res) => {
      const { email, password } = req.body;

      try {
        const collection = db.collection("user");
        const userExists = await collection.findOne({ email });

        if (userExists) {
          return res.status(400).json({ error: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await collection.insertOne({
          email,
          password: hashedPassword,
          firstName: "",
          lastName: "",
          birthday: "",
          address: "",
          profilePicture: "",
          createdAt: new Date(),
        });

        await createNotification(`New user registered: ${email}`);

        res.status(201).json({ message: "User registered successfully!" });
      } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ error: "Registration failed" });
      }
    });

    // Get User Profile
    app.get("/api/user/:email", async (req, res) => {
      const { email } = req.params;

      try {
        const collection = db.collection("user");
        const user = await collection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.status(200).json(user);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: "Failed to fetch user profile" });
      }
    });

    // Update User Profile
    app.put("/api/user/:email", async (req, res) => {
      const { email } = req.params;
      const { firstName, lastName, birthday, address, profilePicture } =
        req.body;

      try {
        const collection = db.collection("user");
        await collection.updateOne(
          { email },
          {
            $set: {
              firstName,
              lastName,
              birthday,
              address,
              profilePicture,
              updatedAt: new Date(),
            },
          }
        );

        await createNotification(`User profile updated: ${email}`);

        res.status(200).json({ message: "User profile updated successfully" });
      } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).json({ error: "Failed to update user profile" });
      }
    });

    // Image upload endpoint
    app.post("/api/upload", upload.single("profilePicture"), (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const imageUrl = `http://localhost:5001/uploads/${req.file.filename}`;
      res.status(200).json({ imageUrl });
    });

    // Login User
    app.post("/api/login", async (req, res) => {
      const { email, password, remember } = req.body;

      try {
        const collection = db.collection("user");
        const user = await collection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: remember ? "30d" : "1d",
        });

        res.status(200).json({ message: "Login successful!", token });
      } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ error: "Login failed" });
      }
    });

    // 📌 Logistics: Submit Request (with Tracking)
    app.post("/api/logistics", async (req, res) => {
      const {
        module,
        requestedBy,
        description,
        recipient,
        requestDate,
        quantity,
      } = req.body;

      if (
        !module ||
        !requestedBy ||
        !description ||
        !recipient ||
        !requestDate ||
        !quantity
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      try {
        const logisticsCollection = db.collection("logistics");
        const trackingCollection = db.collection("tracking");

        const newRequest = {
          module,
          requestedBy,
          description,
          recipient,
          requestDate: new Date(requestDate),
          quantity,
          status: "Pending", // Default status
        };

        // Insert into logistics
        const result = await logisticsCollection.insertOne(newRequest);

        // Create a tracking log
        await trackingCollection.insertOne({
          logId: result.insertedId, // Use the logistics request ID as the log ID
          module,
          status: "Pending",
          updatedBy: requestedBy,
          updatedAt: new Date(),
        });

        await createNotification(
          `New logistics request: ${module} by ${requestedBy}`
        );

        res
          .status(201)
          .json({ message: "Logistics request submitted successfully" });
      } catch (err) {
        console.error("Error submitting logistics request:", err);
        res.status(500).json({ error: "Failed to submit request" });
      }
    });

    // 📌 Logistics: Get All Requests
    app.get("/api/logistics", async (req, res) => {
      try {
        const collection = db.collection("logistics");
        const requests = await collection.find().toArray();
        res.status(200).json(requests);
      } catch (err) {
        console.error("Error fetching logistics requests:", err);
        res.status(500).json({ error: "Failed to fetch requests" });
      }
    });

    // 📌 Production Data: Create
    app.post("/api/production", async (req, res) => {
      const {
        workOrderID,
        dateRequested,
        fulfilledBy,
        dateFulfilled,
        producedQty,
      } = req.body;

      console.log("Received production data:", req.body); // Log the request body

      if (
        !workOrderID ||
        !dateRequested ||
        !fulfilledBy ||
        !dateFulfilled ||
        !producedQty
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      try {
        const collection = db.collection("production");
        const newProduction = {
          workOrderID,
          dateRequested: new Date(dateRequested),
          fulfilledBy,
          dateFulfilled: new Date(dateFulfilled),
          producedQty,
          orderFulfilled: producedQty >= 100, // Example logic for order fulfillment
          orderOnTime: new Date(dateFulfilled) <= new Date(dateRequested), // Example logic for on-time fulfillment
        };

        await collection.insertOne(newProduction);

        await createNotification(`New production data added: ${workOrderID}`);

        res.status(201).json({ message: "Production data added successfully" });
      } catch (err) {
        console.error("Error adding production data:", err);
        res.status(500).json({ error: "Failed to add production data" });
      }
    });

    // 📌 Production Data: Get All
    app.get("/api/production", async (req, res) => {
      try {
        const collection = db.collection("production");
        const productionData = await collection.find().toArray();
        res.status(200).json(productionData);
      } catch (err) {
        console.error("Error fetching production data:", err);
        res.status(500).json({ error: "Failed to fetch production data" });
      }
    });

    // 📌 Production Data: Update
    app.put("/api/production", async (req, res) => {
      const {
        id,
        workOrderID,
        dateRequested,
        fulfilledBy,
        dateFulfilled,
        producedQty,
      } = req.body;

      if (
        !id ||
        !workOrderID ||
        !dateRequested ||
        !fulfilledBy ||
        !dateFulfilled ||
        !producedQty
      ) {
        return res.status(400).json({ error: "All fields are required" });
      }

      try {
        const collection = db.collection("production");
        await collection.updateOne(
          { _id: new ObjectId(id) },
          {
            $set: {
              workOrderID,
              dateRequested: new Date(dateRequested),
              fulfilledBy,
              dateFulfilled: new Date(dateFulfilled),
              producedQty,
              orderFulfilled: producedQty >= 100,
              orderOnTime: new Date(dateFulfilled) <= new Date(dateRequested),
            },
          }
        );

        await createNotification(`Production data updated: ${workOrderID}`);

        res
          .status(200)
          .json({ message: "Production data updated successfully" });
      } catch (err) {
        console.error("Error updating production data:", err);
        res.status(500).json({ error: "Failed to update production data" });
      }
    });

    // 📌 Production Data: Delete
    app.delete("/api/production", async (req, res) => {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ error: "ID is required" });
      }

      try {
        const collection = db.collection("production");
        await collection.deleteOne({ _id: new ObjectId(id) });

        await createNotification(`Production data deleted: ${id}`);

        res
          .status(200)
          .json({ message: "Production data deleted successfully" });
      } catch (err) {
        console.error("Error deleting production data:", err);
        res.status(500).json({ error: "Failed to delete production data" });
      }
    });

    // 📌 Tracking: Get All Logs
    app.get("/api/tracking", async (req, res) => {
      try {
        const collection = db.collection("tracking");
        const trackingLogs = await collection.find().toArray();
        res.status(200).json(trackingLogs);
      } catch (err) {
        console.error("Error fetching tracking logs:", err);
        res.status(500).json({ error: "Failed to fetch tracking logs" });
      }
    });

    // 📌 Tracking: Update Status
    app.put("/api/tracking", async (req, res) => {
      const { logId, status } = req.body;

      if (!logId || !status) {
        return res
          .status(400)
          .json({ error: "Log ID and status are required" });
      }

      try {
        const collection = db.collection("tracking");
        await collection.updateOne(
          { logId },
          { $set: { status, updatedAt: new Date() } }
        );

        await createNotification(
          `Tracking status updated: ${logId} to ${status}`
        );

        res
          .status(200)
          .json({ message: "Tracking status updated successfully" });
      } catch (err) {
        console.error("Error updating tracking status:", err);
        res.status(500).json({ error: "Failed to update tracking status" });
      }
    });

    // 📌 Work Orders: Submit New Work Order (with Tracking)
    app.post("/api/workorder", async (req, res) => {
      const newWorkOrder = req.body;

      try {
        const formattedWorkOrder = {
          ...newWorkOrder,
          createdDate: new Date(newWorkOrder.createdDate).toISOString(),
          dueDate: new Date(newWorkOrder.dueDate).toISOString(),
          status: newWorkOrder.status || "Pending",
        };

        const workOrdersCollection = req.app.locals.db.collection("workorder");
        const result = await workOrdersCollection.insertOne(formattedWorkOrder);

        if (result.acknowledged) {
          res
            .status(201)
            .json({ message: "Work order submitted successfully" });
        } else {
          res.status(500).json({ error: "Failed to submit work order" });
        }
      } catch (err) {
        console.error("Error submitting work order:", err);
        res
          .status(500)
          .json({ error: "An error occurred while submitting work order" });
      }
    });

    app.get("/api/workorder", async (req, res) => {
      try {
        const workOrdersCollection = req.app.locals.db.collection("workorder");
        const workOrders = await workOrdersCollection.find().toArray();
        res.json(workOrders);
      } catch (err) {
        console.error("Error fetching work orders:", err);
        res.status(500).json({ error: "Failed to fetch work orders" });
      }
    });

    app.put("/api/workorder/:workOrderId", async (req, res) => {
      const { workOrderId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      try {
        const workOrdersCollection = req.app.locals.db.collection("workorder");
        const result = await workOrdersCollection.updateOne(
          { _id: new ObjectId(workOrderId) },
          { $set: { status, updatedAt: new Date() } }
        );

        if (result.modifiedCount > 0) {
          res
            .status(200)
            .json({ message: "Work order status updated successfully" });
        } else {
          res.status(500).json({ error: "Failed to update work order status" });
        }
      } catch (err) {
        console.error("Error updating work order status:", err);
        res
          .status(500)
          .json({
            error: "An error occurred while updating work order status",
          });
      }
    });

    // 📌 Reports: Generate PDF Report
    app.post("/api/reports", async (req, res) => {
      try {
        const { productionData, logisticsData, trackingData } = req.body;

        if (!productionData || !logisticsData || !trackingData) {
          return res
            .status(400)
            .json({ error: "All data fields are required" });
        }

        const pdfBuffer = await generatePDF(
          productionData,
          logisticsData,
          trackingData
        );

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=report.pdf");
        res.send(Buffer.from(pdfBuffer));
      } catch (err) {
        console.error("Error generating PDF report:", err);
        res.status(500).json({ error: "Failed to generate report" });
      }
    });

    // 📌 Piechart logic. Logistics/ModuleReqs
    app.get("/api/logistics-summary", async (req, res) => {
      try {
        const collection = db.collection("logistics");
        const logisticsData = await collection.find().toArray();

        const factoryCounts = logisticsData.reduce((acc, item) => {
          acc[item.recipient] = (acc[item.recipient] || 0) + 1;
          return acc;
        }, {});

        const pieChartData = Object.keys(factoryCounts).map((key) => ({
          name: key,
          value: factoryCounts[key],
        }));

        res.status(200).json(pieChartData);
      } catch (err) {
        console.error("Error fetching logistics summary:", err);
        res.status(500).json({ error: "Failed to fetch logistics summary" });
      }
    });

    // 📌 Barchart logic. Logistics/ModuleReqs
    app.get("/api/module-chart", async (req, res) => {
      try {
        res.json(
          await db
            .collection("logistics")
            .aggregate([
              { $group: { _id: "$module", count: { $sum: 1 } } },
              { $sort: { count: -1 } },
            ])
            .toArray()
            .then((data) =>
              data.map((item) => ({ name: item._id, value: item.count }))
            )
        );
      } catch (err) {
        console.error("Error fetching module chart data:", err);
        res.status(500).json({ error: "Failed to fetch module chart data" });
      }
    });

    // 📌 Gaugechart logic. Logistics/ModuleReqs
    app.get("/api/fulfillment-rate", async (req, res) => {
      try {
        const data = await db
          .collection("logistics")
          .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
          .toArray();

        const total = data.reduce((sum, item) => sum + item.count, 0);
        const pending = data.find((item) => item._id === "Pending")?.count || 0;
        const fulfilled = total - pending;

        res.json([
          { name: "Pending", value: pending },
          { name: "Fulfilled", value: fulfilled },
        ]);
      } catch (err) {
        console.error("Error fetching fulfillment data:", err);
        res.status(500).json({ error: "Failed to fetch fulfillment data" });
      }
    });

    // Password Reset
    app.post("/api/forgot-password", async (req, res) => {
      const { email } = req.body;

      try {
        const collection = db.collection("user");
        const user = await collection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const resetToken = jwt.sign({ email }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Password Reset",
          html: `
            <p>You requested a password reset. Click the link below to reset your password:</p>
            <a href="http://localhost:5173/reset-password?token=${resetToken}">Reset Password</a>
          `,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
            return res.status(500).json({ error: "Failed to send email" });
          } else {
            console.log("Email sent:", info.response);
            res
              .status(200)
              .json({ message: "Password reset link sent to your email." });
          }
        });
      } catch (err) {
        console.error("Error during password reset request:", err);
        res
          .status(500)
          .json({ error: "Failed to process password reset request" });
      }
    });

    app.post("/api/reset-password", async (req, res) => {
      const { token, password } = req.body;

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const email = decoded.email;

        const collection = db.collection("user");
        const user = await collection.findOne({ email });

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await collection.updateOne(
          { email },
          { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        res.status(200).json({ message: "Password reset successful!" });
      } catch (err) {
        console.error("Error during password reset:", err);
        res.status(500).json({ error: "Failed to reset password" });
      }
    });

    // User Settings
    app.get("/api/settings", authenticateToken, async (req, res) => {
      try {
        const collection = db.collection("settings");
        const settings = await collection.findOne({ user: req.user.email });

        if (!settings) {
          return res.status(404).json({ error: "Settings not found" });
        }

        res.status(200).json(settings);
      } catch (err) {
        console.error("Error fetching settings:", err);
        res.status(500).json({ error: "Failed to fetch settings" });
      }
    });

    app.post("/api/settings", authenticateToken, async (req, res) => {
      const { pushNotifications, darkMode, emailNotifications, autoLogout } =
        req.body;

      try {
        const collection = db.collection("settings");
        await collection.updateOne(
          { user: req.user.email },
          {
            $set: {
              pushNotifications,
              darkMode,
              emailNotifications,
              autoLogout,
            },
          },
          { upsert: true }
        );

        res.status(200).json({ message: "Settings saved successfully!" });
      } catch (err) {
        console.error("Error saving settings:", err);
        res.status(500).json({ error: "Failed to save settings" });
      }
    });

    // Start server
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("Failed to connect to the database", error);
  });
