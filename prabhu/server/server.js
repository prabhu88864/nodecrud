import "dotenv/config";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

import { connectDB } from "./src/db.js";
import authRoutes from "./src/routes/auth.js";
import userRoutes from "./src/routes/user.js";
import userProfileRoutes from "./src/routes/userProfileRoutes.js";
import roomRoutes from "./src/routes/roomRoutes.js";
import allocationRoutes from "./src/routes/allocationRoutes.js";
import paymentsRoutes from "./src/routes/paymentRoutes.js";
import { runBillingJob } from "./src/services/billingJob.js";

const app = express();
const PORT = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* Middleware */
app.use(morgan("dev"));
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use("/uploads", express.static("uploads"));

/* API routes */
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/userprofile", userProfileRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/allocation", allocationRoutes);
app.use("/api/payments", paymentsRoutes);

/* Serve React */
const buildPath = path.join(__dirname, "client", "build");
app.use(express.static(buildPath));

app.use((req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

/* Start server */
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  } catch (err) {
    console.error(err);
  }
};

startServer();
