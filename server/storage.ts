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
    
    return Array.from(this.transactions.values()).filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= start && transactionDate <= end;
    });
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionCurrentId++;
    // Ensure date is a valid Date object
    const dateValue = typeof insertTransaction.date === 'string' 
      ? new Date(insertTransaction.date)
      : insertTransaction.date;
    
    const transaction: Transaction = { 
      id, 
      ...insertTransaction,
      date: dateValue,
      createdAt: new Date() 
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  async updateTransaction(id: number, updates: UpdateTransaction): Promise<Transaction | undefined> {
    const existingTransaction = this.transactions.get(id);
    
    if (!existingTransaction) {
      return undefined;
    }
    
    // Update the transaction with new values
    const updatedTransaction: Transaction = {
      ...existingTransaction,
      ...updates,
      // Ensure date remains a Date object if it's being updated
      date: updates.date ? (typeof updates.date === 'string' ? new Date(updates.date) : updates.date) : existingTransaction.date
    };
    
    this.transactions.set(id, updatedTransaction);
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
