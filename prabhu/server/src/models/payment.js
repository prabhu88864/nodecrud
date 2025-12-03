// models/payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", required: true, index: true },
  amount: { type: Number, required: true },         // rent for that period
  remaining:{type: Number},
  fromDate: { type: Date, required: true },      // inclusive
  toDate: { type: Date, required: true },        // exclusive
 status: { type: String, enum: ["pending", "paid"]},
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
})


export default mongoose.model("Payment", paymentSchema);
