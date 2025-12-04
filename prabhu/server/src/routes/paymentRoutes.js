// routes/payments.js
import express from "express";
import mongoose from "mongoose";
import Payment from "../models/payment.js";
import UserProfile from "../models/userProfile.js";
import {
  billingMonthLabel,
  getLabelsBetween,
  allocateAmount
} from "../utils/billing.js";

const router = express.Router();


router.get("/summary-report", async (req, res) => {
  try {
    const { from, to, userId } = req.query;
    const match = {};

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ error: "invalid userId" });
      }
      match.user = new mongoose.Types.ObjectId(userId);
    }

    const monthFrom = from ? from.slice(0, 7) : null; // "YYYY-MM"
    const monthTo = to ? to.slice(0, 7) : null;

    const pipeline = [
      { $match: match },
      { $unwind: "$allocations" },

      // Normalize allocations.month -> allocMonthArray (always an array)
      {
        $addFields: {
          allocMonthArray: {
            $cond: [
              { $isArray: "$allocations.month" },
              "$allocations.month",
              [{ $ifNull: ["$allocations.month", null] }]
            ]
          }
        }
      },

      // drop null months
      { $match: { "allocMonthArray.0": { $ne: null } } },

      // unwind to single month per doc
      { $unwind: "$allocMonthArray" },
      { $addFields: { allocMonth: "$allocMonthArray" } },

      // optional month range filter
      ...(monthFrom || monthTo
        ? [{
            $match: {
              allocMonth: {
                ...(monthFrom ? { $gte: monthFrom } : {}),
                ...(monthTo ? { $lte: monthTo } : {})
              }
            }
          }]
        : []),

      // group by user + month — also capture min(periodStart) and max(periodEnd)
      {
        $group: {
          _id: { user: "$user", month: "$allocMonth" },
          expected: { $sum: { $ifNull: ["$allocations.expected", 0] } },
          paid: { $sum: { $ifNull: ["$allocations.paid", 0] } },
          unpaid: { $sum: { $ifNull: ["$allocations.unpaid", 0] } },
          periodStartMin: { $min: "$allocations.periodStart" },
          periodEndMax: { $max: "$allocations.periodEnd" }
        }
      },

      // regroup per user
      {
        $group: {
          _id: "$_id.user",
          months: {
            $push: {
              month: "$_id.month",
              expected: "$expected",
              paid: "$paid",
              unpaid: "$unpaid",
              periodStart: "$periodStartMin",
              periodEnd: "$periodEndMax"
            }
          },
          totalExpected: { $sum: "$expected" },
          totalPaid: { $sum: "$paid" },
          totalUnpaid: { $sum: "$unpaid" }
        }
      },

      // lookup user info
      {
        $lookup: {
          from: "userprofiles",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },

      // project final shape
      {
        $project: {
          _id: 0,
          user: {
            _id: "$user._id",
            fullName: "$user.fullName",
            phone: "$user.phone",
            roomNumber: "$user.roomNumber",
            rentAmount: "$user.rentAmount"
          },
          months: 1,
          totalExpected: 1,
          totalPaid: 1,
          totalUnpaid: 1
        }
      },

      // sort by user name
      { $sort: { "user.fullName": 1 } }
    ];

    const result = await Payment.aggregate(pipeline).allowDiskUse(true);
    return res.json({ count: result.length, results: result });
  } catch (err) {
    console.error("GET /summary-report error:", err);
    return res.status(500).json({ error: err.message });
  }
});


// GET /api/payments/overdue-users?minMonths=2&minUnpaid=1&limit=100&skip=0
router.get("/overdue-users", async (req, res) => {
  try {
    const minMonths = Math.max(0, Number(req.query.minMonths || 2)); // default 2 months
    const minUnpaid = Math.max(0, Number(req.query.minUnpaid || 1)); // default 1 currency unit
    const limit = Math.min(1000, Number(req.query.limit || 100));
    const skip = Math.max(0, Number(req.query.skip || 0));

    // Aggregation on userprofiles: compute monthsPassed, lookup payments sum, compute expected/unpaid
    const pipeline = [
      // only active users with joinedDate
      { $match: { joinedDate: { $exists: true, $ne: null }, isActive: { $ne: false } } },

      // compute full months passed between joinedDate and now
      {
        $addFields: {
          monthsPassed: {
            $dateDiff: { startDate: "$joinedDate", endDate: "$$NOW", unit: "month" }
          }
        }
      },

      // only those who have at least minMonths full months
      { $match: { monthsPassed: { $gte: minMonths } } },

      // lookup payments totals for each user
      {
        $lookup: {
          from: "payments",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$uid"] } } },
            // only count payments up to now (if you want to include future-dated payments still, remove date filter)
            { $group: { _id: null, totalPaid: { $sum: { $ifNull: ["$amount", 0] } } } }
          ],
          as: "paidAgg"
        }
      },

      // simplify paidAgg to a number and compute expected/unpaid
      {
        $addFields: {
          paidTotal: { $ifNull: [{ $arrayElemAt: ["$paidAgg.totalPaid", 0] }, 0] },
          rentPerMonth: { $ifNull: ["$rentAmount", 0] } // if you use allocatedRoom.rentAmount, consider looking it up
        }
      },

      // compute expectedTotal and unpaidTotal
      {
        $addFields: {
          expectedTotal: { $multiply: ["$monthsPassed", "$rentPerMonth"] },
          unpaidTotal: { $max: [{ $subtract: [{ $multiply: ["$monthsPassed", "$rentPerMonth"] }, "$paidTotal"] }, 0] }
        }
      },

      // filter only those with unpaidTotal >= minUnpaid
      { $match: { unpaidTotal: { $gte: minUnpaid } } },

      // project final shape for frontend
      {
        $project: {
          _id: 1,
          fullName: 1,
          phone: 1,
          roomNumber: 1,
          bedNumber: 1,
          joinedDate: 1,
          monthsPassed: 1,
          rentPerMonth: 1,
          expectedTotal: 1,
          paidTotal: 1,
          unpaidTotal: 1
        }
      },

      { $sort: { unpaidTotal: -1, fullName: 1 } },
      { $skip: skip },
      { $limit: limit }
    ];

    const rows = await UserProfile.aggregate(pipeline).allowDiskUse(true);
    // optional: total count (without limit) — run a lighter aggregation to count
    const countPipeline = pipeline.slice(0, pipeline.length - 3).concat([
      { $count: "total" }
    ]);
    const countRes = await UserProfile.aggregate(countPipeline).allowDiskUse(true);
    const total = (countRes[0] && countRes[0].total) ? countRes[0].total : rows.length;

    return res.json({ total, count: rows.length, results: rows });
  } catch (err) {
    console.error("GET /overdue-users error:", err);
    return res.status(500).json({ error: err.message });
  }
});





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
// router.post("/", async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();

//   try {
//     const body = req.body || {};
//     const { user: userId, amount, fromDate, toDate, status, remaining } = body;

//     if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "Valid user id is required" });
//     }
//     if (typeof amount !== "number" && typeof amount !== "string") {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "amount is required" });
//     }
//     if (!fromDate || !toDate) {
//       await session.abortTransaction();
//       session.endSession();
//       return res.status(400).json({ message: "fromDate and toDate are required" });
//     }

//     // ensure user exists
//     const user = await UserProfile.findById(userId).session(session);
//     if (!user) throw new Error("User not found");

//     // build payment doc
//     const paymentData = {
//       user: userId,
//       amount: Number(amount),
//       remaining: typeof remaining !== "undefined" ? Number(remaining) : undefined,
//       fromDate: new Date(fromDate),
//       toDate: new Date(toDate),
//       status: status || "paid"
//     };

//     if (paymentData.status === "paid") paymentData.paidAt = new Date();

//     const payment = new Payment(paymentData);
//     await payment.save({ session });

//     // OPTIONAL: apply amounts to user profile if provided in request body
//     // applyAdvance: number to add to user.advanceAmount
//     // applyDamage: number to subtract from user.damageCharges (payment toward damage)
//     const applyAdvance = body.applyAdvance != null ? Number(body.applyAdvance) : 0;
//     const applyDamage = body.applyDamage != null ? Number(body.applyDamage) : 0;

//     if (applyAdvance || applyDamage) {
//       if (applyAdvance) {
//         user.advanceAmount = (user.advanceAmount || 0) + applyAdvance;
//       }
//       if (applyDamage) {
//         // reduce damageCharges by the paid amount, but never below 0
//         user.damageCharges = Math.max(0, (user.damageCharges || 0) - applyDamage);
//       }
//       await user.save({ session });
//     }

//     await session.commitTransaction();
//     session.endSession();

//     // return populated payment
//     const saved = await Payment.findById(payment._id).populate("user");
//     return res.status(201).json({ message: "Payment recorded", payment: saved });
//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     console.error("POST /api/payments error:", err);
//     return res.status(400).json({ error: err.message });
//   }
// });

// router.post("/", async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const body = req.body;
//     const { user: userId, amount, fromDate, toDate } = body;

//     if (!userId) throw new Error("user id required");
//     if (!amount) throw new Error("amount required");
//     if (!fromDate || !toDate) throw new Error("fromDate & toDate required");

//     const user = await UserProfile.findById(userId).populate("allocatedRoom").session(session);
//     if (!user) throw new Error("User not found");

//     const expectedRent = user.rentAmount || (user.allocatedRoom?.rentAmount || 0);

//     const labels = getLabelsBetween(fromDate, toDate, 28);

//     const allocations = allocateAmount(
//       Number(amount),
//       fromDate,
//       toDate,
//       labels,
//       expectedRent,
//       28
//     );

//     const payment = new Payment({
//       user: userId,
//       amount,
//       fromDate,
//       toDate,
//       status: "paid",
//       paidAt: new Date(),
//       allocations
//     });

//     await payment.save({ session });

//     await session.commitTransaction();
//     session.endSession();

//     return res.status(201).json({
//       message: "Payment created with allocations",
//       payment
//     });

//   } catch (err) {
//     await session.abortTransaction();
//     session.endSession();
//     return res.status(400).json({ error: err.message });
//   }
// });
router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const body = req.body;
    const { user: userId, amount, remaining, month, fromDate, toDate } = body;

    if (!userId) throw new Error("user id required");
    if (typeof amount === "undefined" || amount === null) throw new Error("amount required");
    // allow remaining = 0; only error when undefined/null
    if (typeof remaining === "undefined" || remaining === null) throw new Error("remaining (expected rent) required");

    // if you're using month-style simple allocation:
    // require 'month' OR require fromDate/toDate depending on your flow.
    // here we allow both flows; if month provided use month; else use fromDate/toDate
    const user = await UserProfile.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // Simple PG logic: one allocation per payment (no splitting)
    // Determine period (prefer month if provided)
    let periodStart = null;
    let periodEnd = null;
    let monthLabel = null;
    if (month) {
      monthLabel = month;
      const [y, m] = month.split("-").map(Number);
      periodStart = new Date(y, m - 1, 1, 0, 0, 0);
      periodEnd = new Date(y, m, 0, 23, 59, 59);
    } else if (fromDate && toDate) {
      periodStart = new Date(fromDate);
      periodEnd = new Date(toDate);
      // derive month label from periodStart (optional)
      const y = periodStart.getFullYear();
      const mm = String(periodStart.getMonth() + 1).padStart(2, "0");
      monthLabel = `${y}-${mm}`;
    } else {
      throw new Error("Either month (YYYY-MM) or fromDate & toDate required");
    }

    const expected = Number(remaining);
    const paid = Number(amount);
    const unpaid = Math.max(0, expected - paid);
    

    const allocation = {
      month: monthLabel,
      periodStart,
      periodEnd,
      expected,
      paid,
      unpaid
    };

    const payment = new Payment({
      user: userId,
      amount: paid,
      remaining: unpaid,
      fromDate: periodStart,
      toDate: periodEnd,
      status: "paid",
      paidAt: new Date(),
      allocations: [allocation]
    });

    await payment.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Payment recorded",
      payment
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
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
