import { eq, and, sql, asc, desc } from 'drizzle-orm';
import { db } from './db';
import {
  Category,
  InsertCategory,
  Transaction,
  TransactionWithMonthlyStatus,
  InsertTransaction,
  UpdateTransaction,
  MonthlyTransactionStatus,
  MonthlySummary,
  CategorySummary,
  getRelativeDate
} from '@shared/schema';
import { IStorage } from './storage';
import { log } from './vite';

export class PgStorage implements IStorage {
  async getCategories(): Promise<Category[]> {
    try {
      return await db.query.categories.findMany({
        orderBy: [asc(schema.categories.name)]
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getCategoriesByType(type: "expense" | "income"): Promise<Category[]> {
    try {
      return await db.query.categories.findMany({
        where: eq(schema.categories.type, type),
        orderBy: [asc(schema.categories.name)]
      });
    } catch (error) {
      console.error(`Error getting categories by type ${type}:`, error);
      return [];
    }
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    try {
      const result = await db.insert(schema.categories).values(category).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    try {
      return await db.query.transactions.findMany({
        orderBy: [desc(schema.transactions.date)]
      });
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  }

  async getTransactionsByMonth(year: number, month: number): Promise<TransactionWithMonthlyStatus[]> {
    try {
      log(`Fetching transactions for ${year}-${month}`, 'pgStorage');
      
      // First get all transactions for this month
      const regularTransactions = await this.getFixedTransactionsByMonth(year, month);
      
      // Then get all recurring transactions 
      const recurringTransactions = await this.getRecurringTransactionsByMonth(year, month);
      
      log(`Found ${regularTransactions.length + recurringTransactions.length} transactions for ${year}-${month} (${regularTransactions.length} regular, ${recurringTransactions.length} recurring)`, 'pgStorage');
      
      // Combine both arrays
      const allTransactions = [...regularTransactions, ...recurringTransactions];
      
      // Sort by date
      return allTransactions.sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    } catch (error) {
      console.error(`Error getting transactions for ${year}-${month}:`, error);
      return [];
    }
  }

  private async getFixedTransactionsByMonth(year: number, month: number): Promise<TransactionWithMonthlyStatus[]> {
    // Get all non-recurring transactions and one-time transactions for this month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    // Format dates to ISO string for Postgres
    const startIso = startDate.toISOString();
    const endIso = endDate.toISOString();
    
    try {
      // Get all transactions (non-recurring and recurring, with proper monthly status if available)
      const transactions = await db.transaction(async (tx) => {
        // For fixed date transactions, get transactions within the month
        const monthTransactions = await tx.query.transactions.findMany({
          where: and(
            sql`date >= ${startIso} AND date <= ${endIso}`
          ),
        });
        
        // Now add the monthly status for each transaction
        const result: TransactionWithMonthlyStatus[] = [];
        
        for (const tx of monthTransactions) {
          const monthlyStatus = await this.getMonthlyStatus(tx.id, year, month);
          result.push({
            ...tx,
            monthlyStatus: monthlyStatus
          });
        }
        
        return result;
      });
      
      return transactions;
    } catch (error) {
      console.error(`Error getting fixed transactions for ${year}-${month}:`, error);
      return [];
    }
  }

  private async getRecurringTransactionsByMonth(year: number, month: number): Promise<TransactionWithMonthlyStatus[]> {
    try {
      // Get all recurring transactions
      const recurringTransactions = await db.query.transactions.findMany({
        where: sql`recurrence != 'once'`,
      });
      
      const result: TransactionWithMonthlyStatus[] = [];
      
      // Loop through recurring transactions to see which ones are active for this month
      for (const tx of recurringTransactions) {
        // Skip if this transaction shouldn't be included in this month
        if (!this.shouldRecurInMonth(tx, new Date(year, month - 1, 1), new Date(tx.originalDate || tx.date))) {
          continue;
        }
        
        // Get the specific date for this month based on recurrence pattern
        const dateInMonth = this.getRecurringDateForMonth(tx, year, month);
        
        // Get the monthly status if it exists
        const monthlyStatus = await this.getMonthlyStatus(tx.id, year, month);
        
        // Create a virtual transaction with correct date
        const virtualTransaction: TransactionWithMonthlyStatus = {
          ...tx,
          date: dateInMonth.toISOString(),
          monthlyStatus: monthlyStatus
        };
        
        result.push(virtualTransaction);
      }
      
      return result;
    } catch (error) {
      console.error(`Error getting recurring transactions for ${year}-${month}:`, error);
      return [];
    }
  }

  private shouldRecurInMonth(
    transaction: Transaction, 
    targetMonthDate: Date,
    originalDate: Date
  ): boolean {
    const targetYear = targetMonthDate.getFullYear();
    const targetMonth = targetMonthDate.getMonth();
    const originalYear = originalDate.getFullYear();
    const originalMonth = originalDate.getMonth();
    
    // Don't recur if target month is before original date
    if (
      targetYear < originalYear || 
      (targetYear === originalYear && targetMonth < originalMonth)
    ) {
      return false;
    }
    
    // Calculate months difference
    const monthsDiff = (targetYear - originalYear) * 12 + (targetMonth - originalMonth);
    
    switch (transaction.recurrence) {
      case 'monthly':
        return true; // Occurs every month
      case 'biweekly':
        // We'll simplify and say biweekly transactions appear every month
        return true;
      case 'quarterly':
        return monthsDiff % 3 === 0;
      case 'yearly':
        return monthsDiff % 12 === 0;
      case 'weekly':
        // We'll simplify and say weekly transactions appear every month
        return true;
      default:
        return false;
    }
  }

  private getRecurringDateForMonth(
    transaction: Transaction,
    year: number,
    month: number
  ): Date {
    // If using relative dates, calculate the date based on the pattern
    if (transaction.relativeDateType !== 'fixed') {
      // For relative dates, use the relative date utility
      // Convert null to undefined for the dayOfMonth parameter
      const dayOfMonth = transaction.dayOfMonth ? Number(transaction.dayOfMonth) : undefined;
      return getRelativeDate(year, month, transaction.relativeDateType, dayOfMonth);
    }
    
    // For fixed dates, use the day from the original date but in the current month/year
    const originalDate = new Date(transaction.originalDate || transaction.date);
    let day = originalDate.getDate();
    
    // Adjust for months with fewer days
    const lastDayOfMonth = new Date(year, month, 0).getDate();
    if (day > lastDayOfMonth) {
      day = lastDayOfMonth;
    }
    
    return new Date(year, month - 1, day);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    try {
      const transaction = await db.query.transactions.findFirst({
        where: eq(schema.transactions.id, id)
      });
      return transaction || undefined;
    } catch (error) {
      console.error(`Error getting transaction ${id}:`, error);
      return undefined;
    }
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    try {
      log(`Creating transaction: ${JSON.stringify(insertTransaction)}`, 'pgStorage');
      
      // Explicitly match the transaction data to the table structure
      // using the same field names (snake_case) defined in the schema file
      const result = await db.insert(schema.transactions).values({
        description: insertTransaction.description,
        amount: insertTransaction.amount,
        date: insertTransaction.date,
        type: insertTransaction.type,
        category_id: insertTransaction.categoryId || null,
        status: insertTransaction.status || 'pending',
        recurrence: insertTransaction.recurrence || 'once',
        is_cleared: insertTransaction.isCleared || false,
        relative_date_type: insertTransaction.relativeDateType || 'fixed',
        original_date: insertTransaction.originalDate || null,
        day_of_month: insertTransaction.dayOfMonth || null,
        created_at: new Date().toISOString() 
      } as any).returning();
      
      log(`Created transaction: ${JSON.stringify(result[0])}`, 'pgStorage');
      return result[0];
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  async updateTransaction(id: number, updates: UpdateTransaction): Promise<Transaction | undefined> {
    try {
      // First check if transaction exists
      const transaction = await this.getTransaction(id);
      if (!transaction) {
        return undefined;
      }
      
      // Convert camelCase property names to snake_case for the database
      const formattedUpdates: any = {};
      
      if (updates.description !== undefined) formattedUpdates.description = updates.description;
      if (updates.amount !== undefined) formattedUpdates.amount = updates.amount;
      if (updates.date !== undefined) formattedUpdates.date = updates.date;
      if (updates.type !== undefined) formattedUpdates.type = updates.type;
      if (updates.categoryId !== undefined) formattedUpdates.category_id = updates.categoryId;
      if (updates.status !== undefined) formattedUpdates.status = updates.status;
      if (updates.recurrence !== undefined) formattedUpdates.recurrence = updates.recurrence;
      if (updates.isCleared !== undefined) formattedUpdates.is_cleared = updates.isCleared;
      if (updates.relativeDateType !== undefined) formattedUpdates.relative_date_type = updates.relativeDateType;
      if (updates.originalDate !== undefined) formattedUpdates.original_date = updates.originalDate;
      if (updates.dayOfMonth !== undefined) formattedUpdates.day_of_month = updates.dayOfMonth;
      
      // Only proceed if there's something to update
      if (Object.keys(formattedUpdates).length === 0) {
        return transaction;
      }
      
      log(`Updating transaction ${id}: ${JSON.stringify(formattedUpdates)}`, 'pgStorage');
      
      const result = await db.update(schema.transactions)
        .set(formattedUpdates)
        .where(eq(schema.transactions.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error(`Error updating transaction ${id}:`, error);
      throw error;
    }
  }

  async deleteTransaction(id: number): Promise<boolean> {
    try {
      // First delete any monthly status entries (should cascade, but let's be explicit)
      await db.delete(schema.monthlyTransactionStatus)
        .where(eq(schema.monthlyTransactionStatus.transactionId, id));
      
      // Then delete the transaction
      const result = await db.delete(schema.transactions)
        .where(eq(schema.transactions.id, id))
        .returning();
      
      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting transaction ${id}:`, error);
      return false;
    }
  }

  async getMonthlyStatus(transactionId: number, year: number, month: number): Promise<MonthlyTransactionStatus | undefined> {
    try {
      const status = await db.query.monthlyTransactionStatus.findFirst({
        where: and(
          eq(schema.monthlyTransactionStatus.transactionId, transactionId),
          eq(schema.monthlyTransactionStatus.year, year),
          eq(schema.monthlyTransactionStatus.month, month)
        )
      });
      
      return status || undefined;
    } catch (error) {
      console.error(`Error getting monthly status for transaction ${transactionId} in ${year}-${month}:`, error);
      return undefined;
    }
  }

  async setMonthlyStatus(transactionId: number, year: number, month: number, status: string, isCleared: boolean): Promise<MonthlyTransactionStatus> {
    try {
      // Check if the record already exists
      const existing = await this.getMonthlyStatus(transactionId, year, month);
      
      if (existing) {
        // Update existing record with camelCase field names
        const result = await db.update(schema.monthlyTransactionStatus)
          .set({
            status: status as any,
            isCleared: isCleared // Use camelCase for consistency with schema.ts
          })
          .where(and(
            eq(schema.monthlyTransactionStatus.transactionId, transactionId),
            eq(schema.monthlyTransactionStatus.year, year),
            eq(schema.monthlyTransactionStatus.month, month)
          ))
          .returning();
        
        log(`Updated monthly status for transaction ${transactionId} in ${year}-${month}: ${JSON.stringify(result[0])}`, 'pgStorage');
        return result[0];
      } else {
        // Create new record with camelCase field names
        const newStatus = {
          transactionId: transactionId, // Using camelCase for consistency with schema.ts
          year,
          month,
          status: status as any,
          isCleared: isCleared // Using camelCase for consistency with schema.ts
        };
        
        const result = await db.insert(schema.monthlyTransactionStatus)
          .values([newStatus])
          .returning();
        
        log(`Set monthly status for transaction ${transactionId} in ${year}-${month}: ${JSON.stringify(result[0])}`, 'pgStorage');
        return result[0];
      }
    } catch (error) {
      console.error(`Error setting monthly status for transaction ${transactionId} in ${year}-${month}:`, error);
      throw error;
    }
  }

  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    try {
      log(`Fetching summary for ${year}-${month}`, 'pgStorage');
      
      // Get all transactions for the month
      const transactions = await this.getTransactionsByMonth(year, month);
      
      // Calculate income, expenses, and remaining
      let income = 0;
      let expenses = 0;
      let paidTransactions = 0;
      let pendingTransactions = 0;
      
      // Track expenses by category
      const categoryMap = new Map<number, { id: number, name: string, amount: number }>();
      
      // Process each transaction
      for (const transaction of transactions) {
        const amount = Number(transaction.amount);
        const status = transaction.monthlyStatus?.status || transaction.status;
        
        if (transaction.type === 'income') {
          income += amount;
        } else {
          expenses += amount;
          
          // Track category expenses
          if (transaction.categoryId) {
            const categoryData = categoryMap.get(transaction.categoryId) || {
              id: transaction.categoryId,
              name: '',
              amount: 0
            };
            
            categoryData.amount += amount;
            categoryMap.set(transaction.categoryId, categoryData);
          }
        }
        
        // Count paid vs pending transactions (only for expenses)
        if (transaction.type === 'expense') {
          if (status === 'paid' || status === 'cleared') {
            paidTransactions++;
          } else {
            pendingTransactions++;
          }
        }
      }
      
      // Fill in category names
      // Use Array.from to convert the Map entries to an array to avoid the downlevelIteration error
      for (const [categoryId, data] of Array.from(categoryMap.entries())) {
        // Get category details if not already known
        if (!data.name) {
          try {
            const category = await db.query.categories.findFirst({
              where: eq(schema.categories.id, categoryId)
            });
            if (category) {
              data.name = category.name;
            } else {
              data.name = 'Unknown';
            }
          } catch (error) {
            console.error(`Error fetching category ${categoryId}:`, error);
            data.name = 'Unknown';
          }
        }
      }
      
      // Calculate remaining
      const remaining = income - expenses;
      
      // Calculate percent paid
      const totalTransactions = paidTransactions + pendingTransactions;
      const percentPaid = totalTransactions > 0 ? Math.round((paidTransactions / totalTransactions) * 100) : 0;
      
      // Create category summary with percentages
      const categorySummaries: CategorySummary[] = Array.from(categoryMap.values())
        .map(({ id, name, amount }) => ({
          id,
          name,
          amount,
          percentage: expenses > 0 ? Math.round((amount / expenses) * 100) : 0
        }))
        .sort((a, b) => b.amount - a.amount);
      
      return {
        income,
        expenses,
        remaining,
        totalTransactions,
        paidTransactions,
        pendingTransactions,
        percentPaid,
        categories: categorySummaries
      };
    } catch (error) {
      console.error(`Error getting monthly summary for ${year}-${month}:`, error);
      return {
        income: 0,
        expenses: 0,
        remaining: 0,
        totalTransactions: 0,
        paidTransactions: 0,
        pendingTransactions: 0,
        percentPaid: 0,
        categories: []
      };
    }
  }
}

import * as schema from '@shared/schema';