import { drizzle } from 'drizzle-orm/postgres-js';
import { Pool } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import { log } from './vite';

// Create a database connection
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined');
}

// Initialize Postgres client with Neon serverless driver
const pool = new Pool({ connectionString });

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Run migrations or initialize tables
export async function initDb() {
  try {
    log('Initializing database...', 'db');
    
    // Check if categories table exists, if not create the tables
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categories'
      );
    `);
    
    const tablesExist = result.rows[0].exists;
    
    if (!tablesExist) {
      log('Creating database tables...', 'db');
      
      // Create enums
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
            CREATE TYPE transaction_type AS ENUM ('expense', 'income');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
            CREATE TYPE transaction_status AS ENUM ('pending', 'paid', 'cleared');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence') THEN
            CREATE TYPE recurrence AS ENUM ('once', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly');
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'relative_date_type') THEN
            CREATE TYPE relative_date_type AS ENUM ('fixed', 'first_day', 'last_day', 'custom');
          END IF;
        END
        $$;
      `);
      
      // Create tables
      await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type transaction_type NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          type transaction_type NOT NULL,
          description TEXT NOT NULL,
          amount NUMERIC(10, 2) NOT NULL,
          date TIMESTAMP WITH TIME ZONE NOT NULL,
          category_id INTEGER REFERENCES categories(id),
          status transaction_status NOT NULL DEFAULT 'pending',
          recurrence recurrence NOT NULL DEFAULT 'once',
          is_cleared BOOLEAN NOT NULL DEFAULT false,
          relative_date_type relative_date_type NOT NULL DEFAULT 'fixed',
          original_date TIMESTAMP WITH TIME ZONE,
          day_of_month INTEGER,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS monthly_transaction_status (
          transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
          year INTEGER NOT NULL,
          month INTEGER NOT NULL,
          status transaction_status NOT NULL DEFAULT 'pending',
          is_cleared BOOLEAN NOT NULL DEFAULT false,
          PRIMARY KEY (transaction_id, year, month)
        );
      `);
      
      // Insert default categories
      await pool.query(`
        INSERT INTO categories (name, type) VALUES
        ('Housing', 'expense'),
        ('Utilities', 'expense'),
        ('Groceries', 'expense'),
        ('Transportation', 'expense'),
        ('Health', 'expense'),
        ('Insurance', 'expense'),
        ('Dining', 'expense'),
        ('Entertainment', 'expense'),
        ('Shopping', 'expense'),
        ('Personal', 'expense'),
        ('Education', 'expense'),
        ('Travel', 'expense'),
        ('Debt', 'expense'),
        ('Savings', 'expense'),
        ('Gifts', 'expense'),
        ('Salary', 'income'),
        ('Investments', 'income'),
        ('Interest', 'income'),
        ('Bonus', 'income'),
        ('Other Income', 'income');
      `);
      
      log('Database tables created successfully!', 'db');
    } else {
      log('Database tables already exist', 'db');
    }
    
    log('Database initialization completed', 'db');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}