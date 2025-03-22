import { Fragment } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Transaction, CalendarItem } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import MonthSelector from "./MonthSelector";

// Weekday labels
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarViewProps {
  calendarWeeks: CalendarItem[][];
  transactions: Transaction[];
  month: number;
  year: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  goToMonth: (date: Date) => void;
}

export default function CalendarView({ 
  calendarWeeks, 
  transactions,
  month,
  year,
  onPrevMonth,
  onNextMonth,
  goToMonth
}: CalendarViewProps) {
  const currentDate = new Date(year, month);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Monthly Calendar</CardTitle>
        <MonthSelector 
          currentDate={currentDate}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
          goToMonth={goToMonth}
        />
      </CardHeader>
      <CardContent>
        {/* Calendar Header (Weekdays) */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((day) => (
            <div key={day} className="text-center text-sm font-medium text-slate-500">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="space-y-1">
          {calendarWeeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
              {week.map((day, dayIndex) => (
                <CalendarDay 
                  key={`day-${weekIndex}-${dayIndex}`}
                  calendarItem={day}
                  isToday={isToday(day.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-slate-200 bg-slate-50">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-100 rounded-full mr-1"></div>
            <span>Paid</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-100 rounded-full mr-1"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-100 rounded-full mr-1"></div>
            <span>Income</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

interface CalendarDayProps {
  calendarItem: CalendarItem;
  isToday: boolean;
}

function CalendarDay({ calendarItem, isToday }: CalendarDayProps) {
  const { day, isCurrentMonth, date, transactions } = calendarItem;
  
  // Sort transactions: income first, then expenses
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.type === "income" && b.type !== "income") return -1;
    if (a.type !== "income" && b.type === "income") return 1;
    return 0;
  });
  
  return (
    <div className="calendar-day p-1 aspect-square">
      <div 
        className={`
          h-full rounded p-1 flex flex-col text-xs
          ${isCurrentMonth 
            ? isToday 
              ? 'border-2 border-primary bg-primary bg-opacity-5' 
              : 'border border-slate-200'
            : 'bg-slate-50 text-slate-400'
          }
        `}
      >
        <div className={`text-right ${isToday ? 'font-bold' : ''}`}>{day}</div>
        
        {isCurrentMonth && (
          <div className="mt-auto space-y-1 overflow-hidden">
            {sortedTransactions.slice(0, 2).map((transaction) => (
              <div 
                key={transaction.id}
                className={`
                  expense-pill text-xs p-0.5 px-1.5 rounded-full truncate
                  ${transaction.type === 'income' 
                    ? 'bg-blue-100 text-blue-800' 
                    : transaction.status === 'pending' 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }
                `}
                title={`${transaction.description}: ${formatCurrency(transaction.amount)}`}
              >
                {`${transaction.description}: ${formatCurrency(transaction.amount)}`}
              </div>
            ))}
            
            {transactions.length > 2 && (
              <div className="text-center text-[10px] text-slate-500">
                +{transactions.length - 2} more
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}
