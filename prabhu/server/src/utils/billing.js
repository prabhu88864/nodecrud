// utils/billing.js
export function getMonthRange(month) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y, m - 1, 1, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59); // last day of month
  return { start, end };
}

export function billingMonthLabel(date, cutoff = 28) {
  let d = new Date(date);
  if (d.getDate() >= cutoff) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  } else {
    let prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }
}

export function billingPeriodRange(label, cutoff = 28) {
  const [y, m] = label.split("-").map(Number);
  let start = new Date(y, m - 1, cutoff, 0, 0, 0);
  let next = new Date(y, m, cutoff, 0, 0, 0);
  next.setMilliseconds(next.getMilliseconds() - 1);
  return { start, end: next };
}

export function getLabelsBetween(fromDate, toDate, cutoff = 28) {
  const labels = [];
  let label = billingMonthLabel(fromDate, cutoff);

  for (let i = 0; i < 120; i++) {
    const { start, end } = billingPeriodRange(label, cutoff);
    if (end < new Date(fromDate)) {
      const [y, m] = label.split("-").map(Number);
      let next = new Date(y, m, 1);
      label = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
      continue;
    }
    if (start > new Date(toDate)) break;

    labels.push(label);

    const [yy, mm] = label.split("-").map(Number);
    let nextMonth = new Date(yy, mm, 1);
    label = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
  }

  return labels;
}

export function overlapDays(a1, a2, b1, b2) {
  const start = Math.max(a1.getTime(), b1.getTime());
  const end = Math.min(a2.getTime(), b2.getTime());
  if (end < start) return 0;
  return (end - start) / (1000 * 60 * 60 * 24) + 1;
}

export function allocateAmount(totalAmount, fromDate, toDate, labels, expectedAmount, cutoff = 28) {
  let chunks = [];
  let totalWeight = 0;

  const periods = labels.map((label) => {
    const { start, end } = billingPeriodRange(label, cutoff);
    const days = overlapDays(start, end, new Date(fromDate), new Date(toDate));
    const weight = days * expectedAmount;

    totalWeight += weight;

    return { label, start, end, expected: expectedAmount, weight };
  });

  for (let p of periods) {
    const paid = totalWeight === 0 ? 0 : (totalAmount * (p.weight / totalWeight));
    const unpaid = Math.max(0, p.expected - paid);

    chunks.push({
      month: p.label,
      periodStart: p.start,
      periodEnd: p.end,
      expected: Math.round(p.expected),
      paid: Math.round(paid),
      unpaid: Math.round(unpaid)
    });
  }

  return chunks;
}
