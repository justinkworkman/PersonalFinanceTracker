import { 
  Category, 
  InsertCategory, 
  Transaction, 
  InsertTransaction, 
  UpdateTransaction,
  MonthlySummary,
  CategorySummary,
  getRelativeDate, 
  getDaysInMonth
} from "@shared/schema";
import { startOfMonth, endOfMonth, isSameMonth, format, parseISO } from "date-fns";

export interface IStorage {
  // Categories
  getCategories(): Promise<Category[]>;
  getCategoriesByType(type: "expense" | "income"): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Transactions
  getTransactions(): Promise<Transaction[]>;
  getTransactionsByMonth(year: number, month: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: UpdateTransaction): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Summary Data
  getMonthlySummary(year: number, month: number): Promise<MonthlySummary>;
}

export class MemStorage implements IStorage {
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private categoryCurrentId: number;
  private transactionCurrentId: number;

  constructor() {
    this.categories = new Map();
    this.transactions = new Map();
    this.categoryCurrentId = 1;
    this.transactionCurrentId = 1;
    
    // Initialize with some default categories
    this.initializeDefaultCategories();
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

  async getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
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
      
      // Create a virtual transaction with the updated date
      // This is not stored in the database, just generated for display
      // Create a virtual transaction with the updated date
      const virtualTransaction: Transaction & { isVirtualRecurrence?: boolean } = {
        ...transaction,
        date: newDate.toISOString(),
        // Reset status for recurring transactions in future months
        status: "pending" as const,
        isCleared: false,
        // Mark as virtual instance to distinguish from actual transactions
        isVirtualRecurrence: true
      };
      
      return virtualTransaction;
    });
    
    // Combine regular and virtual recurring transactions
    const allTransactions = [...regularTransactions, ...virtualRecurringTransactions];
    
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
        return monthDiff > 0;
      case "biweekly":
        // Biweekly recurrence approximates to 2 occurrences per month
        return monthDiff > 0;
      case "monthly":
        // Monthly recurs every month
        return monthDiff > 0;
      case "quarterly":
        // Every 3 months
        return monthDiff > 0 && monthDiff % 3 === 0;
      case "yearly":
        // Every 12 months
        return monthDiff > 0 && monthDiff % 12 === 0;
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
    
    // Save original date for recurring transactions
    const originalDate = insertTransaction.date;
    
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
    
    // Update the transaction with new values
    const updatedTransaction: Transaction = {
      ...existingTransaction,
      ...updates,
      date: dateValue
    };
    
    this.transactions.set(id, updatedTransaction);
    console.log("Updated transaction:", updatedTransaction);
    return updatedTransaction;
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
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
    
    const totalTransactions = transactions.length;
    const paidTransactions = transactions.filter(t => t.status === "paid" || t.status === "cleared").length;
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
