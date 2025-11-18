// services/paymentService.js
import Payment from "../models/payment.js";
import UserProfile from "../models/userProfile.js";
import { addMonthsKeepDay } from "../utils/date.js";

export async function createFirstPaymentForUser(user) {
  // user: mongoose document (UserProfile) - must have joinedDate and rentAmount
  const periodStart = user.joinedDate ? new Date(user.joinedDate) : new Date();
  const periodEnd = addMonthsKeepDay(periodStart, 1);
  // policy: dueDate at periodEnd (change if you want dueDate = periodStart)
  const dueDate = new Date(periodEnd);
  const amount = user.rentAmount || 0;

  const payment = new Payment({
    user: user._id,
    amount,
    periodStart,
    periodEnd,
    dueDate,
    status: "pending"
  });

  await payment.save();
  return payment;
}
