import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for transaction types (expense or income)
export const transactionTypeEnum = pgEnum("transaction_type", ["expense", "income"]);

// Enum for transaction status
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "paid", "cleared"]);

// Enum for recurrence patterns
export const recurrenceEnum = pgEnum("recurrence", ["once", "weekly", "biweekly", "monthly", "quarterly", "yearly"]);
export const relativeDateTypeEnum = pgEnum("relative_date_type", ["fixed", "first_day", "last_day", "custom"]);

// Categories table for expense/income categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  type: transactionTypeEnum("type").notNull(),
});

// Transactions table for both expenses and income
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: transactionTypeEnum("type").notNull().default("expense"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  date: text("date").notNull(), // Using text for date to store ISO strings
  categoryId: integer("category_id").references(() => categories.id),
  status: transactionStatusEnum("status").notNull().default("pending"),
  recurrence: recurrenceEnum("recurrence").notNull().default("once"),
  isCleared: boolean("is_cleared").notNull().default(false),
  
  // Fields for relative date handling
  relativeDateType: relativeDateTypeEnum("relative_date_type").notNull().default("fixed"),
  dayOfMonth: integer("day_of_month"), // For custom relative dates (e.g., 15th of each month)
  originalDate: text("original_date"), // Store the original date for recurring items
  
  createdAt: text("created_at").notNull(), // Using text for timestamp to store ISO strings
});

// Create schemas for validation and typing
export const insertCategorySchema = createInsertSchema(categories);
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  originalDate: true, // We'll handle this automatically
}).extend({
  // Allow date to be passed as Date object or ISO string
  date: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? val : val.toISOString()
  ),
  // Add default values for relative date fields
  relativeDateType: z.enum(["fixed", "first_day", "last_day", "custom"]).default("fixed"),
  dayOfMonth: z.number().optional(),
  // Optional transform function for easier client handling
  originalDate: z.union([z.string(), z.date(), z.undefined()]).optional().transform(val => 
    val ? (typeof val === 'string' ? val : val.toISOString()) : undefined
  )
});

// Create schemas for updates
export const updateTransactionSchema = insertTransactionSchema.partial();

// Create types from the schemas
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type UpdateTransaction = z.infer<typeof updateTransactionSchema>;

// Type for the monthly summary data
export type MonthlySummary = {
  income: number;
  expenses: number;
  remaining: number;
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  percentPaid: number;
  categories: CategorySummary[];
};

export type CategorySummary = {
  id: number;
  name: string;
  amount: number;
  percentage: number;
};

// Type for calendar items
export type CalendarItem = {
  day: number;
  isCurrentMonth: boolean;
  date: Date;
  transactions: Transaction[];
};

// Utility functions for working with relative dates
export function getRelativeDate(
  year: number, 
  month: number, 
  relativeType: "fixed" | "first_day" | "last_day" | "custom",
  dayOfMonth?: number,
  originalDate?: string
): Date {
  // Create a date object for the specified month
  const date = new Date(year, month - 1);
  
  switch (relativeType) {
    case "first_day":
      // First day of month - already set correctly
      return date;
    
    case "last_day":
      // Last day of month - set to next month and subtract a day
      const nextMonth = new Date(year, month);
      nextMonth.setDate(0); // This sets it to the last day of the previous month
      return nextMonth;
    
    case "custom":
      if (dayOfMonth && dayOfMonth > 0 && dayOfMonth <= 31) {
        // Try to set the specified day, but handle months with fewer days
        const customDate = new Date(year, month - 1);
        customDate.setDate(Math.min(dayOfMonth, getDaysInMonth(year, month)));
        return customDate;
      }
      // Falls through to fixed date if dayOfMonth is invalid

    case "fixed":
    default:
      // For fixed dates, we use the original date but update year/month
      if (originalDate) {
        const original = new Date(originalDate);
        // Create new date with original day but in the specified month/year
        const fixedDay = Math.min(original.getDate(), getDaysInMonth(year, month));
        return new Date(year, month - 1, fixedDay);
      }
      // Fallback to first day of month if no original date
      return date;
  }
}

// Helper function to get days in month
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}
