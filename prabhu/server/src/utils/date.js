// utils/date.js
export function addMonthsKeepDay(date, months) {
    const d = new Date(date);
    const targetMonth = d.getMonth() + months;
    const desiredDay = d.getDate();
    const tmp = new Date(d.getFullYear(), targetMonth, 1, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
    const lastDay = new Date(tmp.getFullYear(), tmp.getMonth() + 1, 0).getDate();
    tmp.setDate(Math.min(desiredDay, lastDay));
    return tmp;
  }
  