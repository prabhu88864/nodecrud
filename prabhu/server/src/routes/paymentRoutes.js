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
    const minMonths = Math.max(0, Number(req.query.minMonths || 1));
    const minUnpaid = Math.max(0, Number(req.query.minUnpaid || 1));
    const limit = Math.min(1000, Number(req.query.limit || 100));
    const skip = Math.max(0, Number(req.query.skip || 0));
    const q = (req.query.q || "").trim();

    // base match: only active users with joinedDate
    const baseMatch = {
      joinedDate: { $exists: true, $ne: null },
      isActive: { $ne: false }
    };

    // if q is present, add search conditions
    if (q.length > 0) {
      const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      baseMatch.$or = [
        { fullName: re },
        { phone: re },
        { roomNumber: re },
        { bedNumber: re }
      ];
    }

    const pipeline = [
      { $match: baseMatch },

      {
        $addFields: {
          monthsPassed: {
            $dateDiff: { startDate: "$joinedDate", endDate: "$$NOW", unit: "month" }
          }
        }
      },

      { $match: { monthsPassed: { $gte: minMonths } } },

      {
        $lookup: {
          from: "payments",
          let: { uid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$uid"] } } },
            {
              $group: {
                _id: null,
                totalPaid: { $sum: { $ifNull: ["$amount", 0] } }
              }
            }
          ],
          as: "paidAgg"
        }
      },

      {
        $addFields: {
          paidTotal: { $ifNull: [{ $arrayElemAt: ["$paidAgg.totalPaid", 0] }, 0] },
          rentPerMonth: { $ifNull: ["$rentAmount", 0] }
        }
      },

      {
        $addFields: {
          expectedTotal: { $multiply: ["$monthsPassed", "$rentPerMonth"] },
          unpaidTotal: {
            $max: [
              { $subtract: [{ $multiply: ["$monthsPassed", "$rentPerMonth"] }, "$paidTotal"] },
              0
            ]
          }
        }
      },

      { $match: { unpaidTotal: { $gte: minUnpaid } } },

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

    // rows for this page
    const rows = await UserProfile.aggregate(pipeline).allowDiskUse(true);

    // 👉 pipeline without sort/skip/limit, to compute totals on all matching users
    const baseForTotals = pipeline.slice(0, pipeline.length - 3);

    // total overdue users count
    const countPipeline = baseForTotals.concat([{ $count: "totalUsers" }]);
    const countRes = await UserProfile.aggregate(countPipeline).allowDiskUse(true);
    const totalUsers = countRes[0]?.totalUsers || 0;

    // sum of unpaidTotal / expectedTotal / paidTotal
    const sumPipeline = baseForTotals.concat([
      {
        $group: {
         
          totalUnpaidAmount: { $sum: "$unpaidTotal" },
         
        }
      }
    ]);

    const sumRes = await UserProfile.aggregate(sumPipeline).allowDiskUse(true);
    const totals = sumRes[0] || {
      totalUnpaidAmount: 0,
      totalExpectedAmount: 0,
      totalPaidAmount: 0
    };

    // if you want "total" to mean "total unpaid amount":
    return res.json({
 
      totalUnpaidAmount: totals.totalUnpaidAmount,
                                     // how many users overdue
      count: rows.length,                        // how many in this page
    
    });
  } catch (err) {
    console.error("GET /overdue-users error:", err);
    return res.status(500).json({ error: err.message });
  }
});




router.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const body = req.body;
    const { user: userId, amount, remaining, month, fromDate, toDate,status } = body;

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

    const expected = user.rentAmount || user.allocatedRoom.rentAmount;
    const paid = Number(amount);
    const unpaid = Number(remaining);
    

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
      status: status,
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

// router.put("/:id", async (req, res) => {
//   try {
//     const payment = await Payment.findById(req.params.id);
//     if (!payment) return res.status(404).json({ message: "Payment not found" });

//     // 1️⃣ Save OLD values (including old paidAt)
//     payment.oldValues.push({
//       amount: payment.amount,
//       remaining: payment.remaining,
//       paidAt: payment.paidAt,   // 👈 first/previous payment time
//       status: payment.status,
//       updatedAt: new Date()
//     });

//     // 2️⃣ Update fields (but do NOT trust paidAt from body)
//     const fields = ["amount", "remaining", "status", "fromDate", "toDate"];
//     fields.forEach((key) => {
//       if (req.body[key] !== undefined) {
//         payment[key] = req.body[key];
//       }
//     });

//     // 3️⃣ Set NEW paidAt for this change
//     payment.paidAt = new Date();   // 👈 this becomes latest payment time

//     await payment.save();

//     return res.json({ message: "Payment updated with history", payment });
//   } catch (err) {
//     console.error("PUT /api/payments/:id error:", err);
//     return res.status(400).json({ error: err.message });
//   }
// });
router.put("/:id", async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    // 1️⃣ snapshot for history (including allocation)
    const firstAlloc = payment.allocations && payment.allocations.length
      ? payment.allocations[0]
      : null;

    payment.oldValues = payment.oldValues || [];
    payment.oldValues.push({
      amount: payment.amount,
      remaining: payment.remaining,
      paidAt: payment.paidAt,
      status: payment.status,
      updatedAt: new Date(),
      allocationSnapshot: firstAlloc
        ? {
            month: firstAlloc.month,
            periodStart: firstAlloc.periodStart,
            periodEnd: firstAlloc.periodEnd,
            expected: firstAlloc.expected,
            paid: firstAlloc.paid,
            unpaid: firstAlloc.unpaid
          }
        : null
    });

    // 2️⃣ update top-level simple fields
    const fields = ["amount", "remaining", "status", "fromDate", "toDate"];
    fields.forEach((key) => {
      if (req.body[key] !== undefined) {
        payment[key] = req.body[key];
      }
    });

    // 3️⃣ always set new paidAt (latest payment update time)
    payment.paidAt = new Date();

    // 4️⃣ ensure we have one allocation
    if (!payment.allocations || payment.allocations.length === 0) {
      payment.allocations = [{
        month: null,
        periodStart: payment.fromDate,
        periodEnd: payment.toDate,
        expected: 0,
        paid: 0,
        unpaid: 0
      }];
    }

    const alloc = payment.allocations[0];

    // 5️⃣ sync periodStart/periodEnd/month with fromDate/toDate (if changed)
    if (payment.fromDate) alloc.periodStart = new Date(payment.fromDate);
    if (payment.toDate) alloc.periodEnd = new Date(payment.toDate);

    if (alloc.periodStart) {
      const y = alloc.periodStart.getFullYear();
      const mm = String(alloc.periodStart.getMonth() + 1).padStart(2, "0");
      alloc.month = `${y}-${mm}`; // "YYYY-MM"
    }

    // 6️⃣ recompute paid / unpaid based on payment values
    const paid = Number(payment.amount || 0);
    const remaining = Number(payment.remaining || 0);

    // keep expected as-is if already set, otherwise derive from paid+remaining
    if (typeof alloc.expected !== "number" || isNaN(alloc.expected)) {
      alloc.expected = paid + remaining;
    }

    alloc.paid = paid;
    alloc.unpaid = remaining;

    // 7️⃣ optionally adjust status based on remaining (if you want auto logic)
    // if (remaining <= 0) {
    //   payment.status = "paid";
    // } else if (!payment.status) {
    //   payment.status = "unpaid";
    // }

    await payment.save();

    return res.json({ message: "Payment updated with history and allocations", payment });
  } catch (err) {
    console.error("PUT /api/payments/:id error:", err);
    return res.status(400).json({ error: err.message });
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
