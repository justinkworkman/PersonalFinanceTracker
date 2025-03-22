import { pgTable, text, serial, integer, boolean, date, timestamp, real, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum for transaction types (expense or income)
export const transactionTypeEnum = pgEnum("transaction_type", ["expense", "income"]);

// Enum for transaction status
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "paid", "cleared"]);

// Enum for recurrence patterns
export const recurrenceEnum = pgEnum("recurrence", ["once", "weekly", "biweekly", "monthly", "quarterly", "yearly"]);

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
  createdAt: text("created_at").notNull(), // Using text for timestamp to store ISO strings
});

// Create schemas for validation and typing
export const insertCategorySchema = createInsertSchema(categories);
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
}).extend({
  // Allow date to be passed as Date object or ISO string
  date: z.union([z.string(), z.date()]).transform(val => 
    typeof val === 'string' ? val : val.toISOString()
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
