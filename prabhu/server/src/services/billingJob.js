// services/billingJob.js
import UserProfile from "../models/userProfile.js";
import Payment from "../models/payment.js";
import { addMonthsKeepDay } from "../utils/date.js";

/**
 * Run billing job to ensure payments exist up to `aheadDays` in future.
 * - aheadDays: how many days ahead to create payments (default 30)
 * - batchSize: how many users processed per loop (to avoid memory spike)
 */
export async function runBillingJob({ aheadDays = 30, batchSize = 200 } = {}) {
  const now = new Date();
  const horizon = new Date(now.getTime() + aheadDays * 24 * 60 * 60 * 1000);

  // cursor to iterate active users only
  const cursor = UserProfile.find({ isActive: true }).cursor();

  let created = 0;
  for await (const user of cursor) {
    try {
      // fetch last payment for user
      const last = await Payment.findOne({ user: user._id }).sort({ periodStart: -1 });

      // decide nextStart
      let nextStart;
      if (!last) {
        // use user's joinedDate or today if absent
        nextStart = user.joinedDate ? new Date(user.joinedDate) : new Date();
      } else {
        nextStart = addMonthsKeepDay(last.periodStart, 1);
      }

      // create payments until nextStart is after horizon
      while (nextStart <= horizon) {
        // idempotency: skip if payment for this user+periodStart already exists
        const exists = await Payment.findOne({ user: user._id, periodStart: nextStart });
        if (!exists) {
          const nextEnd = addMonthsKeepDay(nextStart, 1);
          const p = new Payment({
            user: user._id,
            amount: user.rentAmount || 0,
            periodStart: nextStart,
            periodEnd: nextEnd,
            dueDate: nextEnd,
            status: "pending",
          });
          await p.save();
          created++;
        }
        // advance to next month
        nextStart = addMonthsKeepDay(nextStart, 1);
      }
    } catch (err) {
      console.warn(`Billing job: failed for user ${user._id}:`, err.message);
      // continue with other users
    }
  }

  return { created, horizon: horizon.toISOString() };
}
