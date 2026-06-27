import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";

export function getSixMonthsRange(startDate: Date = new Date()) {
  const from = startOfMonth(startDate);
  const to = endOfMonth(addMonths(from, 5));
  return {
    from: format(from, "yyyy-MM-dd"),
    to: format(to, "yyyy-MM-dd"),
    fromD: from,
    toD: to,
  };
}

export function getMonthGrid(monthStart: Date) {
  const start = startOfWeek(monthStart, { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function generateMonthsList(startDate: Date = new Date(), count = 6) {
  const months = [];
  const start = startOfMonth(startDate);
  for (let i = 0; i < count; i++) {
    months.push(addMonths(start, i));
  }
  return months;
}
