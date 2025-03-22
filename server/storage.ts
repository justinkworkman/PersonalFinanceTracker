import { 
  Category, 
  InsertCategory, 
  Transaction, 
  InsertTransaction, 
  UpdateTransaction,
  MonthlySummary,
  CategorySummary,
  getRelativeDate, 
  getDaysInMonth,
  MonthlyTransactionStatus,
  InsertMonthlyStatus,
  UpdateMonthlyStatus,
  TransactionWithMonthlyStatus
} from "@shared/schema";
import { startOfMonth, endOfMonth, isSameMonth, format, parseISO } from "date-fns";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesByType(type: "expense" | "income"): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByMonth(year: number, month: number): Promise<TransactionWithMonthlyStatus[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: UpdateTransaction): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Monthly Transaction Status
  getMonthlyStatus(transactionId: number, year: number, month: number): Promise<MonthlyTransactionStatus | undefined>;
  setMonthlyStatus(transactionId: number, year: number, month: number, status: string, isCleared: boolean): Promise<MonthlyTransactionStatus>;
  
  // Summary Data
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private monthlyStatuses: Map<string, MonthlyTransactionStatus>;
  private categoryCurrentId: number;
  private transactionCurrentId: number;

  constructor() {
    this.categories = new Map();
    this.transactions = new Map();
    this.monthlyStatuses = new Map();
    this.categoryCurrentId = 1;
    this.transactionCurrentId = 1;
    
    // Initialize with some default categories
    this.initializeDefaultCategories();
  }
  
  // Helper method to generate a unique key for monthly status
  private getMonthlyStatusKey(transactionId: number, year: number, month: number): string {
    return `${transactionId}-${year}-${month}`;
  }
  
  private initializeDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: "Housing", type: "expense" },
      { name: "Utilities", type: "expense" },
      { name: "Groceries", type: "expense" },
      { name: "Transportation", type: "expense" },
      { name: "Insurance", type: "expense" },
      { name: "Healthcare", type: "expense" },
      { name: "Entertainment", type: "expense" },
      { name: "Other", type: "expense" },
      { name: "Paycheck", type: "income" },
      { name: "Bonus", type: "income" },
      { name: "Refund", type: "income" },
      { name: "Other Income", type: "income" },
    ];
    
    for (const category of defaultCategories) {
      this.createCategory(category);
    }
  }
  
  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values());
  }
  
  async getCategoriesByType(type: "expense" | "income"): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(category => category.type === type);
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = this.categoryCurrentId++;
    const category: Category = { id, ...insertCategory };
    this.categories.set(id, category);
    return category;
  }
  
  async getTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values());
  }

  async getTransactionsByMonth(year: number, month: number): Promise<TransactionWithMonthlyStatus[]> {
    console.log(`Fetching transactions for ${year}-${month}`);
    // Calculate start and end of month
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    
    // Start with the regular transactions in this month
    const regularTransactions = Array.from(this.transactions.values()).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= start && transactionDate <= end;
    });
    
    // Handle recurring transactions - get all transactions with a recurrence that's not "once"
    const recurringTransactions = Array.from(this.transactions.values()).filter(transaction => {
      if (transaction.recurrence === "once") return false;
      
      // Get the original transaction date
      const originalDate = new Date(transaction.originalDate || transaction.date);
      const transactionDate = new Date(transaction.date);
      
      // Only consider transactions that started before or in the current month
      if (transactionDate > end) return false;
      
      // Generate a recurring instance for this month based on recurrence pattern
      return this.shouldRecurInMonth(transaction, year, month, originalDate);
    });
    
    // For each recurring transaction, create a virtual instance for this month
    const virtualRecurringTransactions = recurringTransactions.map(transaction => {
      // Calculate the date for this month based on the relative date type
      const newDate = this.getRecurringDateForMonth(transaction, year, month);
      
      // Get current date to determine if this is a future month
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
      
      // Default values for status and isCleared
      // Always default to "pending" for future months
      let status: "pending" | "paid" | "cleared" = "pending";
      let isCleared = false;
      
      // Check if there's a monthly status for this transaction
      const statusKey = this.getMonthlyStatusKey(transaction.id, year, month);
      const monthlyStatus = this.monthlyStatuses.get(statusKey);
      
      if (monthlyStatus) {
        // If there's an explicit monthly status set, use it
        status = monthlyStatus.status;
        isCleared = monthlyStatus.isCleared;
      } else if (year > currentYear || (year === currentYear && month > currentMonth)) {
        // For future months with no explicit status, always default to pending
        status = "pending";
        isCleared = false;
      }
      
      // Create a virtual transaction with the updated date and monthly status
      const virtualTransaction: TransactionWithMonthlyStatus = {
        ...transaction,
        date: newDate.toISOString(),
        // Use the monthly status if available
        status: status,
        isCleared: isCleared,
        // Include the monthly status reference
        monthlyStatus: monthlyStatus
      };
      
      return virtualTransaction;
    });
    
    // Enhance regular transactions with any monthly status information
    const enhancedRegularTransactions = regularTransactions.map(transaction => {
      // For regular transactions, check if there's any override status for this month
      const statusKey = this.getMonthlyStatusKey(transaction.id, year, month);
      const monthlyStatus = this.monthlyStatuses.get(statusKey);
      
      if (monthlyStatus) {
        return {
          ...transaction,
          status: monthlyStatus.status,
          isCleared: monthlyStatus.isCleared,
          monthlyStatus
        } as TransactionWithMonthlyStatus;
      }
      
      // If no monthly status, just return the transaction as is
      return { ...transaction } as TransactionWithMonthlyStatus;
    });
    
    // Combine regular and virtual recurring transactions
    const allTransactions = [...enhancedRegularTransactions, ...virtualRecurringTransactions];
    
    console.log(`Found ${allTransactions.length} transactions for ${year}-${month} (${regularTransactions.length} regular, ${virtualRecurringTransactions.length} recurring)`);
    return allTransactions;
  }
  
  // Helper method to determine if a transaction should recur in the given month
  private shouldRecurInMonth(
    transaction: Transaction, 
    year: number, 
    month: number, 
    originalDate: Date
  ): boolean {
    const origYear = originalDate.getFullYear();
    const origMonth = originalDate.getMonth() + 1; // 1-based month
    
    // If the target month is before the original date, don't recur
    if (year < origYear || (year === origYear && month < origMonth)) {
      return false;
    }
    
    // If it's the same month as the original, don't create a duplicate
    if (year === origYear && month === origMonth) {
      return false;
    }
    
    // Calculate months between original and target
    const monthDiff = (year - origYear) * 12 + (month - origMonth);
    
    switch (transaction.recurrence) {
      case "weekly":
        // Weekly recurrence approximates to 4 weeks per month
        return true; // Show in all future months
      case "biweekly":
        // Biweekly recurrence approximates to 2 occurrences per month
        return true; // Show in all future months
      case "monthly":
        // Monthly recurs every month
        return true; // Every month after the original
      case "quarterly":
        // Every 3 months
        return monthDiff % 3 === 0; // Every 3rd month
      case "yearly":
        // Every 12 months
        return monthDiff % 12 === 0; // Every 12th month
      default:
        return false;
    }
  }
  
  // Helper method to calculate the recurring date for a transaction in a given month
  private getRecurringDateForMonth(
    transaction: Transaction,
    year: number,
    month: number
  ): Date {
    // Use the shared utility function to calculate the date
    return getRelativeDate(
      year,
      month,
      transaction.relativeDateType,
      transaction.dayOfMonth || undefined,
      transaction.originalDate || transaction.date
    );
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    
    // For recurring transactions, ensure we have an originalDate
    let originalDate: string | null = insertTransaction.originalDate || null;
    if (insertTransaction.recurrence !== "once" && !originalDate) {
      originalDate = insertTransaction.date;
    }
    
    // Create the transaction with default values for required fields
    const transaction: Transaction = { 
      id, 
      ...insertTransaction,
      // Make sure we have all required fields by setting defaults
      type: insertTransaction.type || "expense",
      status: insertTransaction.status || "pending",
      recurrence: insertTransaction.recurrence || "once",
      isCleared: insertTransaction.isCleared !== undefined ? insertTransaction.isCleared : false,
      categoryId: insertTransaction.categoryId || null,
      relativeDateType: insertTransaction.relativeDateType || "fixed",
      dayOfMonth: insertTransaction.dayOfMonth || null,
      originalDate: originalDate,
      createdAt: new Date().toISOString() 
    };
    
    this.transactions.set(id, transaction);
    console.log("Created transaction:", transaction);
    return transaction;
  }
  
  async updateTransaction(id: number, updates: UpdateTransaction): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    
    if (!existingTransaction) {
      return undefined;
    }
    
    // Process date if it's being updated
    let dateValue = existingTransaction.date;
    if (updates.date) {
      const newDate = typeof updates.date === 'string' 
        ? new Date(updates.date)
        : updates.date;
      dateValue = newDate.toISOString();
    }
    
    // Ensure we have the correct originalDate for recurring transactions
    let originalDateValue: string | null = updates.originalDate || existingTransaction.originalDate;
    
    // If recurrence is being updated to be recurring, and there's no originalDate, use the transaction date
    if (updates.recurrence && updates.recurrence !== "once" && !originalDateValue) {
      originalDateValue = dateValue;
    }
    
    // If recurrence is being updated to be non-recurring, clear originalDate
    if (updates.recurrence === "once") {
      originalDateValue = null;
    }
    
    // Update the transaction with new values
    const updatedTransaction: Transaction = {
      ...existingTransaction,
      ...updates,
      date: dateValue,
      originalDate: originalDateValue
    };
    
    this.transactions.set(id, updatedTransaction);
    console.log("Updated transaction:", updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }
  
  async getMonthlyStatus(transactionId: number, year: number, month: number): Promise<MonthlyTransactionStatus | undefined> {
    const key = this.getMonthlyStatusKey(transactionId, year, month);
    return this.monthlyStatuses.get(key);
  }
  
  async setMonthlyStatus(transactionId: number, year: number, month: number, status: string, isCleared: boolean): Promise<MonthlyTransactionStatus> {
    const key = this.getMonthlyStatusKey(transactionId, year, month);
    const monthlyStatus: MonthlyTransactionStatus = {
      transactionId,
      year,
      month,
      status: status as any, // Cast to proper enum type
      isCleared
    };
    
    this.monthlyStatuses.set(key, monthlyStatus);
    console.log(`Set monthly status for transaction ${transactionId} in ${year}-${month}:`, monthlyStatus);
    return monthlyStatus;
  }
  
  async getMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
    const transactions = await this.getTransactionsByMonth(year, month);
    
    // Calculate income, expenses, and remaining
    const income = transactions
      .filter(t => t.type === "income")
      .reduce((total, t) => total + t.amount, 0);
    
    const expenses = transactions
      .filter(t => t.type === "expense")
      .reduce((total, t) => total + t.amount, 0);
    
    // Get current date to determine if this is a future month
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // JavaScript months are 0-based
    
    const totalTransactions = transactions.length;
    
    // Count transactions marked as paid or cleared
    // For future months, only count transactions with explicit monthly status
    const paidTransactions = transactions.filter(t => {
      // Only count transactions that are explicitly marked as paid or cleared
      return (t.status === "paid" || t.status === "cleared");
    }).length;
    
    const pendingTransactions = totalTransactions - paidTransactions;
    const percentPaid = totalTransactions > 0 ? (paidTransactions / totalTransactions) * 100 : 0;
    
    // Group expenses by category for category breakdown
    const categoryMap = new Map<number, { id: number, name: string, amount: number }>();
    
    for (const transaction of transactions) {
      if (transaction.type === "expense" && transaction.categoryId) {
        const category = this.categories.get(transaction.categoryId);
        if (category) {
          const existing = categoryMap.get(category.id);
          if (existing) {
            existing.amount += transaction.amount;
          } else {
            categoryMap.set(category.id, {
              id: category.id,
              name: category.name,
              amount: transaction.amount
            });
          }
        }
      }
    }
    
    // Convert category map to array and calculate percentages
    const categoryArray = Array.from(categoryMap.values());
    const categorySummary: CategorySummary[] = categoryArray.map(cat => ({
      id: cat.id,
      name: cat.name,
      amount: cat.amount,
      percentage: expenses > 0 ? (cat.amount / expenses) * 100 : 0
    }));
    
    // Sort categories by amount (highest first)
    categorySummary.sort((a, b) => b.amount - a.amount);
    
    return {
      income,
      expenses,
      remaining: income - expenses,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      percentPaid,
      categories: categorySummary
    };
  }
}

export const storage = new MemStorage();
