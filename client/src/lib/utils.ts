import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format a number as currency (USD)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format a date to a readable string
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

// Get the month name from a date
export function getMonthName(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
}

// Get the month and year from a date
export function getMonthYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { 
    month: 'long',
    year: 'numeric'
  }).format(date);
}
