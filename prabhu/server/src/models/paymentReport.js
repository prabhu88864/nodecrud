// models/paymentReport.js
import mongoose from 'mongoose';

const PaymentReportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProfile', required: true },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
  month: { type: String, required: true }, // "YYYY-MM" label for billing period
  periodStart: { type: Date, required: true }, // start date of that billing period
  periodEnd: { type: Date, required: true },   // end date of that billing period
  expected: { type: Number, required: true, default: 0 }, // full expected rent for that billing period
  paid: { type: Number, required: true, default: 0 },     // amount from this payment allocated to this period
  unpaid: { type: Number, required: true, default: 0 },   // expected - paid (>=0)
  createdAt: { type: Date, default: Date.now }
});

PaymentReportSchema.index({ user: 1, month: 1 });
PaymentReportSchema.index({ payment: 1 });

export default mongoose.model('PaymentReport', PaymentReportSchema);
