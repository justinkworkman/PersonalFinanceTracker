import { useState, useEffect } from "react";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  addMonths, 
  subMonths,
  format 
} from "date-fns";
import { CalendarItem } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Transaction } from "@shared/schema";

export function useCalendar(selectedDate: Date, setSelectedDate?: (date: Date) => void) {
  // Track current date for the calendar
  const [currentDate, setCurrentDate] = useState(selectedDate);
  
  // Update currentDate when selectedDate changes
  useEffect(() => {
    setCurrentDate(selectedDate);
  }, [selectedDate]);
  
  // Extract year and month from current date
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  
  // Fetch transactions for this month
  const { data: transactions = [] } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/month', year, month],
  });
  
  // Generate calendar days
  const calendarWeeks = generateCalendarMonth(currentDate, transactions);
  
  // Navigation functions
  const prevMonth = () => {
    const newDate = subMonths(currentDate, 1);
    setCurrentDate(newDate);
    if (setSelectedDate) setSelectedDate(newDate);
  };
  
  const nextMonth = () => {
    const newDate = addMonths(currentDate, 1);
    setCurrentDate(newDate);
    if (setSelectedDate) setSelectedDate(newDate);
  };
  
  const goToMonth = (date: Date) => {
    setCurrentDate(date);
    if (setSelectedDate) setSelectedDate(date);
  };
  
  return {
    currentDate,
    calendarWeeks,
    prevMonth,
    nextMonth,
    goToMonth
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
