// models/payment.js
import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "UserProfile", required: true, index: true },
  amount: { type: Number, required: true },         // rent for that period
  periodStart: { type: Date, required: true },      // inclusive
  periodEnd: { type: Date, required: true },        // exclusive
  dueDate: { type: Date, required: true, index: true }, // when payment is due
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending", index: true },
  paidAt: Date,
  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({ user: 1, dueDate: 1 });

export default mongoose.model("Payment", paymentSchema);
