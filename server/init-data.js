// This script will initialize default data when running in Docker
const { db } = require('./db');
const { categories } = require('../shared/schema');
const { eq } = require('drizzle-orm');

async function initializeDefaultData() {
  console.log('Initializing default categories...');
  
  try {
    // Check if we already have categories
    const existingCategories = await db.select().from(categories);
    
    if (existingCategories.length === 0) {
      // Insert default expense categories
      await db.insert(categories).values([
        { name: 'Rent/Mortgage', type: 'expense' },
        { name: 'Utilities', type: 'expense' },
        { name: 'Groceries', type: 'expense' },
        { name: 'Transportation', type: 'expense' },
        { name: 'Dining Out', type: 'expense' },
        { name: 'Entertainment', type: 'expense' },
        { name: 'Healthcare', type: 'expense' },
        { name: 'Insurance', type: 'expense' },
        { name: 'Subscriptions', type: 'expense' },
        { name: 'Shopping', type: 'expense' },
        { name: 'Education', type: 'expense' },
        { name: 'Personal Care', type: 'expense' },
        { name: 'Travel', type: 'expense' },
        { name: 'Gifts/Donations', type: 'expense' },
        { name: 'Miscellaneous', type: 'expense' },
      ]);
      
      // Insert default income categories
      await db.insert(categories).values([
        { name: 'Salary', type: 'income' },
        { name: 'Bonus', type: 'income' },
        { name: 'Investment', type: 'income' },
        { name: 'Freelance', type: 'income' },
        { name: 'Rental Income', type: 'income' },
        { name: 'Other Income', type: 'income' },
      ]);
      
      console.log('Default categories created successfully');
    } else {
      console.log(`Found ${existingCategories.length} existing categories, skipping initialization`);
    }
  } catch (error) {
    console.error('Error initializing default data:', error);
  }
  
  process.exit(0);
}

initializeDefaultData();