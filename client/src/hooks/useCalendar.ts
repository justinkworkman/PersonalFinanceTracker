import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  format 
} from "date-fns";
import { CalendarItem } from "@shared/schema";
import { Transaction } from "@shared/schema";

export function useCalendar(date: Date, transactions: Transaction[] = []) {
  // Make sure transactions is always an array
  const transactionsArray = Array.isArray(transactions) ? transactions : [];
  
  // Generate calendar based on the provided date and transactions
  const calendarWeeks = generateCalendarMonth(date, transactionsArray);
  
  return {
    calendarWeeks
  };
}

// Helper function to generate calendar data structure
function generateCalendarMonth(date: Date, transactions: Transaction[]): CalendarItem[][] {
  // Get the start and end dates for the month view
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  // Get all days in the calendar range
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd
  });
  
  // Group transactions by date
  const transactionsByDate: Record<string, Transaction[]> = {};
  
  transactions.forEach(transaction => {
    const dateStr = format(new Date(transaction.date), 'yyyy-MM-dd');
    if (!transactionsByDate[dateStr]) {
      transactionsByDate[dateStr] = [];
    }
    transactionsByDate[dateStr].push(transaction);
  });
  
  // Create calendar items with transactions
  const calendarItems: CalendarItem[] = calendarDays.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return {
      day: day.getDate(),
      isCurrentMonth: isSameMonth(day, date),
      date: day,
      transactions: transactionsByDate[dayStr] || []
    };
  });
  
  // Group by weeks (7 days per week)
  const calendarWeeks: CalendarItem[][] = [];
  for (let i = 0; i < calendarItems.length; i += 7) {
    calendarWeeks.push(calendarItems.slice(i, i + 7));
  }
  
  return calendarWeeks;
}
