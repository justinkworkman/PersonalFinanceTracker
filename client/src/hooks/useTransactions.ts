import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Transaction, InsertTransaction, UpdateTransaction } from "@shared/schema";
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
