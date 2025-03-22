import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertTransactionSchema, 
  updateTransactionSchema, 
  insertCategorySchema,
  Transaction,
  MonthlyTransactionStatus
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const router = express.Router();
  
  // Health check route
  router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  
  // Get all categories
  router.get("/categories", async (_req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Get categories by type
  router.get("/categories/:type", async (req, res) => {
    try {
      const type = req.params.type as "expense" | "income";
      
      if (type !== "expense" && type !== "income") {
        return res.status(400).json({ message: "Type must be 'expense' or 'income'" });
      }
      
      const categories = await storage.getCategoriesByType(type);
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories by type:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  // Create a new category
  router.post("/categories", async (req, res) => {
    try {
      const categoryData = insertCategorySchema.parse(req.body);
      const category = await storage.createCategory(categoryData);
      res.status(201).json(category);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });
  
  // Get all transactions
  router.get("/transactions", async (_req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Get transactions by month with or without params
  router.get("/transactions/month/:year?/:month?", async (req, res) => {
    try {
      let year, month;
      
      // Check if year and month are in the URL params
      if (req.params.year && req.params.month) {
        year = parseInt(req.params.year);
        month = parseInt(req.params.month);
      } 
      // If not, check if they're in the query string
      else if (req.query.year && req.query.month) {
        year = parseInt(req.query.year as string);
        month = parseInt(req.query.month as string);
      }
      // If still not found, use current date
      else {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        month = currentDate.getMonth() + 1;
      }
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      
      console.log(`Fetching transactions for ${year}-${month}`);
      const transactions = await storage.getTransactionsByMonth(year, month);
      res.json(transactions);
    } catch (err) {
      console.error("Error fetching transactions by month:", err);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });
  
  // Get a specific transaction
  router.get("/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const transaction = await storage.getTransaction(id);
      
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(transaction);
    } catch (err) {
      console.error("Error fetching transaction:", err);
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });
  
  // Create a new transaction
  router.post("/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      
      // Validate the date format
      if (typeof transactionData.date === 'string') {
        const parsedDate = parseISO(transactionData.date);
        if (!isValid(parsedDate)) {
          return res.status(400).json({ message: "Invalid date format. Please use ISO format (YYYY-MM-DD)" });
        }
      }
      
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating transaction:", err);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  
  // Update a transaction
  router.patch("/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const updates = updateTransactionSchema.parse(req.body);
      
      // Validate date format if provided
      if (updates.date && typeof updates.date === 'string') {
        const parsedDate = parseISO(updates.date);
        if (!isValid(parsedDate)) {
          return res.status(400).json({ message: "Invalid date format. Please use ISO format (YYYY-MM-DD)" });
        }
      }
      
      const updatedTransaction = await storage.updateTransaction(id, updates);
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(updatedTransaction);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating transaction:", err);
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  
  // Delete a transaction
  router.delete("/transactions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      const deleted = await storage.deleteTransaction(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.status(204).end();
    } catch (err) {
      console.error("Error deleting transaction:", err);
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });
  
  // Get monthly summary with or without params
  router.get("/summary/:year?/:month?", async (req, res) => {
    try {
      let year, month;
      
      // Check if year and month are in the URL params
      if (req.params.year && req.params.month) {
        year = parseInt(req.params.year);
        month = parseInt(req.params.month);
      } 
      // If not, check if they're in the query string
      else if (req.query.year && req.query.month) {
        year = parseInt(req.query.year as string);
        month = parseInt(req.query.month as string);
      }
      // If still not found, use current date
      else {
        const currentDate = new Date();
        year = currentDate.getFullYear();
        month = currentDate.getMonth() + 1;
      }
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      
      console.log(`Fetching summary for ${year}-${month}`);
      const summary = await storage.getMonthlySummary(year, month);
      res.json(summary);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
      res.status(500).json({ message: "Failed to fetch monthly summary" });
    }
  });
  
  // Schema for monthly status update
  const monthlyStatusSchema = z.object({
    status: z.enum(["pending", "paid", "cleared"]),
    isCleared: z.boolean().default(false)
  });
  
  // Update monthly status for a transaction
  router.put("/transactions/:id/monthly-status/:year/:month", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      
      // Verify transaction exists
      const transaction = await storage.getTransaction(id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Parse the request body
      const { status, isCleared } = monthlyStatusSchema.parse(req.body);
      
      // Update monthly status
      const monthlyStatus = await storage.setMonthlyStatus(id, year, month, status, isCleared);
      
      res.json(monthlyStatus);
    } catch (err) {
      if (err instanceof ZodError) {
        const validationError = fromZodError(err);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating monthly transaction status:", err);
      res.status(500).json({ message: "Failed to update monthly transaction status" });
    }
  });
  
  // Get monthly status for a transaction
  router.get("/transactions/:id/monthly-status/:year/:month", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid transaction ID" });
      }
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ message: "Invalid year or month" });
      }
      
      // Get monthly status
      const monthlyStatus = await storage.getMonthlyStatus(id, year, month);
      
      if (!monthlyStatus) {
        return res.status(404).json({ message: "Monthly status not found" });
      }
      
      res.json(monthlyStatus);
    } catch (err) {
      console.error("Error getting monthly transaction status:", err);
      res.status(500).json({ message: "Failed to get monthly transaction status" });
    }
  });

  // Apply the router with the prefix
  app.use("/api", router);

  // Create and return the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
