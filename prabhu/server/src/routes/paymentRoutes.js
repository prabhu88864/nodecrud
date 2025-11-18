// routes/payments.js
import express from "express";
import mongoose from "mongoose";
import Payment from "../models/payment.js";
import UserProfile from "../models/userProfile.js";
import { addMonthsKeepDay } from "../utils/date.js";

const router = express.Router();

// helper to create next payment for a user (simple)
async function createNextPaymentForUser(userId) {
  const user = await UserProfile.findById(userId);
  if (!user) throw new Error("User not found");
  const last = await Payment.findOne({ user: userId }).sort({ periodStart: -1 });

  let nextStart;
  if (!last) nextStart = user.joinedDate ? new Date(user.joinedDate) : new Date();
  else nextStart = addMonthsKeepDay(last.periodStart, 1);

  const nextEnd = addMonthsKeepDay(nextStart, 1);
  const p = new Payment({
    user: user._id,
    amount: user.rentAmount || 0,
    periodStart: nextStart,
    periodEnd: nextEnd,
    dueDate: nextEnd,
    status: "pending"
  });
  await p.save();
  return p;
}

// GET pending payments (due now or overdue)
// optional ?userId=<id>
router.get("/pending", async (req, res) => {
  try {
    const { userId } = req.query;
    const today = new Date();
    const q = { status: "pending", dueDate: { $lte: today } };
    if (userId) q.user = userId;
    const list = await Payment.find(q).populate("user", "fullName phone roomNumber bedNumber");
    res.json({ count: list.length, payments: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET upcoming payments within next N days (default 30)
// optional ?userId=<id>&days=7
router.get("/upcoming", async (req, res) => {
  try {
    const days = parseInt(req.query.days || "30", 10);
    const { userId } = req.query;
    const today = new Date();
    const upto = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    const q = { status: "pending", dueDate: { $gt: today, $lte: upto } };
    if (userId) q.user = userId;
    const list = await Payment.find(q).populate("user", "fullName phone roomNumber bedNumber");
    res.json({ count: list.length, payments: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /:id/pay -> mark payment as paid; body: { paidAt(optional ISO), createNext:true/false }
router.post("/:id/pay", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const payment = await Payment.findById(req.params.id).session(session);
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "paid") throw new Error("Payment already paid");

    payment.status = "paid";
    payment.paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    await payment.save({ session });

    // optionally create next payment automatically
    if (req.body.createNext) {
      await createNextPaymentForUser(payment.user);
    }

    await session.commitTransaction();
    session.endSession();

    const fresh = await Payment.findById(payment._id).populate("user", "fullName phone");
    res.json({ message: "Payment marked paid", payment: fresh });
  } catch (err) {
    try { await session.abortTransaction(); } catch (_) {}
    session.endSession();
    res.status(400).json({ message: "Error marking paid", error: err.message });
  }
});

// convenience: get all payments (optional userId)
router.get("/", async (req, res) => {
  try {
    const q = {};
    if (req.query.userId) q.user = req.query.userId;
    const list = await Payment.find(q).sort({ dueDate: 1 }).populate("user", "fullName phone roomNumber");
    res.json({ count: list.length, payments: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
