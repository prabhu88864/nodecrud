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

// GET paid payments (optional ?userId=... & ?from=YYYY-MM-DD & ?to=YYYY-MM-DD)
router.get("/paid", async (req, res) => {
  try {
    const { userId, from, to } = req.query;
    const q = { status: "paid" };

    if (userId) q.user = userId;

    // optional date range on paidAt
    if (from || to) {
      q.paidAt = {};
      if (from) {
        const fromD = new Date(from);
        if (!isNaN(fromD.getTime())) q.paidAt.$gte = fromD;
      }
      if (to) {
        // include the whole 'to' day by setting time to end of day
        const toD = new Date(to);
        if (!isNaN(toD.getTime())) {
          toD.setHours(23,59,59,999);
          q.paidAt.$lte = toD;
        }
      }
      // if paidAt ended up empty because parsing failed, delete it
      if (Object.keys(q.paidAt).length === 0) delete q.paidAt;
    }

    const list = await Payment.find(q)
      .sort({ paidAt: -1 })
      .populate("user", "fullName phone roomNumber bedNumber");

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
  try {
    console.log("PAY endpoint hit:", { params: req.params, body: req.body });

    // ensure we received body
    const body = req.body || {};
    const providedStatus = body.status;

    // validate status present
    if (!providedStatus || typeof providedStatus !== "string") {
      return res.status(400).json({ message: "status is required in request body (e.g. 'paid')" });
    }

    // find payment
    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // protect: if already paid and client trying to set paid again, error
    if (payment.status === "paid" && providedStatus === "paid") {
      return res.status(400).json({ message: "Payment already paid" });
    }

    // update
    payment.status = providedStatus;
    if (providedStatus === "paid") {
      payment.paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
    } else {
      // if changing away from paid, clear paidAt (optional)
      // payment.paidAt = undefined;
    }

    await payment.save();

    const fresh = await Payment.findById(payment._id).populate("user", "fullName phone roomNumber");

    return res.json({ message: "Payment updated", payment: fresh });
  } catch (err) {
    console.error("Error in /:id/pay:", err);
    return res.status(500).json({ message: "Error updating payment", error: err.message });
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
