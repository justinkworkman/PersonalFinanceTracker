import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, InsertTransaction, UpdateTransaction, MonthlyTransactionStatus } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Hook for fetching transactions by month
export function useMonthlyTransactions(year: number, month: number) {
  return useQuery<Transaction[]>({
    queryKey: ['/api/transactions/month', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Hook for creating a new transaction
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: InsertTransaction) => {
      const response = await apiRequest("POST", "/api/transactions", transaction);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
    }
  });
}

// Hook for updating a transaction
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number, updates: UpdateTransaction }) => {
      const response = await apiRequest("PATCH", `/api/transactions/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
    }
  });
}

// Hook for deleting a transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
      return id;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
    }
  });
}

// Hook for fetching monthly status for a transaction
export function useMonthlyStatus(transactionId: number, year: number, month: number) {
  return useQuery<MonthlyTransactionStatus>({
    queryKey: ['/api/transactions', transactionId, 'monthly-status', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!transactionId && !!year && !!month,
  });
}

// Hook for updating monthly status
export function useUpdateMonthlyStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      transactionId,
      year,
      month,
      status,
      isCleared
    }: {
      transactionId: number;
      year: number;
      month: number;
      status: string;
      isCleared: boolean;
    }) => {
      const response = await apiRequest(
        "PUT", 
        `/api/transactions/${transactionId}/monthly-status/${year}/${month}`,
        { status, isCleared }
      );
      return response.json();
    },
    onSuccess: (_, variables) => {
      const { transactionId, year, month } = variables;
      
      // Invalidate specific monthly status
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions', transactionId, 'monthly-status', year, month]
      });
      
      // Invalidate monthly transactions
      queryClient.invalidateQueries({
        queryKey: ['/api/transactions/month', year, month]
      });
      
      // Invalidate monthly summary
      queryClient.invalidateQueries({
        queryKey: ['/api/summary', year, month]
      });
    }
  });
}
