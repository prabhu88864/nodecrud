// // models/payment.js
// import mongoose from "mongoose";

// const paymentSchema = new mongoose.Schema({
//   user: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", required: true, index: true },
//   amount: { type: Number, required: true },         // rent for that period
//   remaining:{type: Number},
//   fromDate: { type: Date, required: true },      // inclusive
//   toDate: { type: Date, required: true },        // exclusive
//  status: { type: String, enum: ["pending", "paid"]},
//   paidAt: Date,
//   createdAt: { type: Date, default: Date.now }
// })


// export default mongoose.model("Payment", paymentSchema);

// models/payment.js
import mongoose from "mongoose";

const AllocationSchema = new mongoose.Schema({
  month: { type: String, required: true }, // "YYYY-MM"
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  expected: { type: Number, required: true },
  paid: { type: Number, required: true },
  unpaid: { type: Number, required: true }
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", required: true },
  amount: { type: Number, required: true },

  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },

  status: { type: String, default: "paid" },
  paidAt: { type: Date },

  remaining: { type: Number, default: 0 },

  allocations: [AllocationSchema], // <<<<<< IMPORTANT

    oldValues: [
    {
      amount: Number,
      remaining: Number,
      paidAt: Date,
      status: String,
      updatedAt: Date
    }
  ]

}, { timestamps: true });

PaymentSchema.index({ user: 1 });

export default mongoose.model("Payment", PaymentSchema);

