import { 
  Category, 
  InsertCategory, 
  Transaction, 
  InsertTransaction, 
  UpdateTransaction,
  MonthlySummary,
  CategorySummary
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
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    
    // Get all transactions, convert string dates to Date objects for comparison
    const result = Array.from(this.transactions.values()).filter(transaction => {
      // Handle date as string (from storage) or Date object
      const transactionDate = new Date(transaction.date);
      return transactionDate >= start && transactionDate <= end;
    });
    
    console.log(`Found ${result.length} transactions for ${year}-${month}`);
    return result;
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    
    // The date is already transformed to ISO string by the schema
    const transaction: Transaction = { 
      id, 
      ...insertTransaction,
      // Make sure we have all required fields by setting defaults
      type: insertTransaction.type || "expense",
      status: insertTransaction.status || "pending",
      recurrence: insertTransaction.recurrence || "once",
      isCleared: insertTransaction.isCleared !== undefined ? insertTransaction.isCleared : false,
      categoryId: insertTransaction.categoryId || null,
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
