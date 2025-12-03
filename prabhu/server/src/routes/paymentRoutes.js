// routes/payments.js
import express from "express";
import mongoose from "mongoose";
import Payment from "../models/payment.js";
import UserProfile from "../models/userProfile.js";

const router = express.Router();

/**
 * POST /       - create payment
 * GET  /       - list payments (filter by user/status/from/to)
 * GET  /:id    - get single payment
 * PUT  /:id    - update payment (optionally apply to user with ?apply=true)
 * DELETE /:id  - delete payment
 */

/* -------------------
   CREATE PAYMENT
   Body:
   {
     "user": "<userId>",
     "amount": 5000,
     "fromDate": "2025-12-01",
     "toDate": "2025-12-31",
     "status": "paid",            // optional: "pending" or "paid"
     "remaining": 0,              // optional
     // Optional helper fields (not stored in Payment doc but used to update user):
     "applyAdvance": 5000,        // add to user.advanceAmount
     "applyDamage": 200           // reduce user.damageCharges by this amount
   }
-------------------- */
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const body = req.body || {};
    const { user: userId, amount, fromDate, toDate, status, remaining } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Valid user id is required" });
    }
    if (typeof amount !== "number" && typeof amount !== "string") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "amount is required" });
    }
    if (!fromDate || !toDate) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "fromDate and toDate are required" });
    }

    // ensure user exists
    const user = await UserProfile.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // build payment doc
    const paymentData = {
      user: userId,
      amount: Number(amount),
      remaining: typeof remaining !== "undefined" ? Number(remaining) : undefined,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      status: status || "paid"
    };

    if (paymentData.status === "paid") paymentData.paidAt = new Date();

    const payment = new Payment(paymentData);
    await payment.save({ session });

    // OPTIONAL: apply amounts to user profile if provided in request body
    // applyAdvance: number to add to user.advanceAmount
    // applyDamage: number to subtract from user.damageCharges (payment toward damage)
    const applyAdvance = body.applyAdvance != null ? Number(body.applyAdvance) : 0;
    const applyDamage = body.applyDamage != null ? Number(body.applyDamage) : 0;

    if (applyAdvance || applyDamage) {
      if (applyAdvance) {
        user.advanceAmount = (user.advanceAmount || 0) + applyAdvance;
      }
      if (applyDamage) {
        // reduce damageCharges by the paid amount, but never below 0
        user.damageCharges = Math.max(0, (user.damageCharges || 0) - applyDamage);
      }
      await user.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    // return populated payment
    const saved = await Payment.findById(payment._id).populate("user");
    return res.status(201).json({ message: "Payment recorded", payment: saved });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("POST /api/payments error:", err);
    return res.status(400).json({ error: err.message });
  }
});

/* -------------------
   LIST PAYMENTS
   Query params:
     - user (userId)
     - status (pending|paid)
     - from (ISO date)   -> payments with fromDate >= this
     - to   (ISO date)   -> payments with toDate <= this
     - limit, skip
-------------------- */
router.get("/", async (req, res) => {
  try {
    const { user: userId, status, from, to, limit = 50, skip = 0 } = req.query;
    const filter = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid user id in query" });
      }
      filter.user = userId;
    }
    if (status) filter.status = status;
    if (from) {
      const d = new Date(from);
      if (!isNaN(d.getTime())) filter.fromDate = { $gte: d };
    }
    if (to) {
      const d = new Date(to);
      if (!isNaN(d.getTime())) filter.toDate = filter.toDate || {};
      if (!isNaN(d.getTime())) filter.toDate.$lte = d;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Math.min(1000, Number(limit)))
      .populate("user", "fullName phone roomNumber");

    const count = await Payment.countDocuments(filter);
    res.json({ count, payments });
  } catch (err) {
    console.error("GET /api/payments error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------
   GET ONE PAYMENT
-------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid payment id" });

    const payment = await Payment.findById(id).populate("user");
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json({ payment });
  } catch (err) {
    console.error("GET /api/payments/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* -------------------
   UPDATE PAYMENT
   PUT /:id
   Body: any fields from Payment model to update.
   Optional query param: ?apply=true  — when set and body includes applyAdvance/applyDamage numeric values,
   the route will also update the user profile inside the same transaction.
-------------------- */
router.put("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Invalid payment id" });
    }

    const payment = await Payment.findById(id).session(session);
    if (!payment) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Payment not found" });
    }

    // Merge allowed fields
    const updatable = ["amount", "remaining", "fromDate", "toDate", "status", "paidAt"];
    updatable.forEach((k) => {
      if (typeof req.body[k] !== "undefined") {
        payment[k] = req.body[k];
      }
    });

    // auto-set paidAt when status becomes paid
    if (payment.status === "paid" && !payment.paidAt) payment.paidAt = new Date();

    // Optionally apply to user if requested via query param ?apply=true
    const doApply = String(req.query.apply || "false").toLowerCase() === "true";
    if (doApply) {
      const applyAdvance = req.body.applyAdvance != null ? Number(req.body.applyAdvance) : 0;
      const applyDamage = req.body.applyDamage != null ? Number(req.body.applyDamage) : 0;

      if ((applyAdvance || applyDamage) && (!payment.user || !mongoose.Types.ObjectId.isValid(String(payment.user)))) {
        throw new Error("Payment has no valid user to apply to");
      }

      const user = await UserProfile.findById(payment.user).session(session);
      if (!user) throw new Error("User not found when applying payment");

      if (applyAdvance) {
        user.advanceAmount = (user.advanceAmount || 0) + applyAdvance;
      }
      if (applyDamage) {
        user.damageCharges = Math.max(0, (user.damageCharges || 0) - applyDamage);
      }
      await user.save({ session });
    }

    await payment.save({ session });
    await session.commitTransaction();
    session.endSession();

    const updated = await Payment.findById(payment._id).populate("user");
    res.json({ message: "Payment updated", payment: updated });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("PUT /api/payments/:id error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* -------------------
   DELETE PAYMENT
   Note: this does NOT reverse any applied user amounts (extend if you want that).
-------------------- */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid payment id" });

    const payment = await Payment.findById(id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    await payment.deleteOne();
    res.json({ message: "Payment deleted" });
  } catch (err) {
    console.error("DELETE /api/payments/:id error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
