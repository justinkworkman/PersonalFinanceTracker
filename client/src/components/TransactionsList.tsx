import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, AlertCircle, LayoutList } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Transaction } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface TransactionsListProps {
  transactions: Transaction[];
  onTransactionClick: (transaction: Transaction) => void;
}

type FilterType = "all" | "expense" | "income";

export default function TransactionsList({ 
  transactions, 
  onTransactionClick
}: TransactionsListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Apply filter to transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === "all") return true;
    return transaction.type === filter;
  });
  
  // Sort transactions by date (newest first)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  const toggleTransactionStatus = async (transaction: Transaction, event: React.MouseEvent) => {
    // Prevent the click from triggering the parent container's onClick
    event.stopPropagation();
    
    try {
      // Toggle between pending and paid
      const newStatus = transaction.status === "pending" ? "paid" : "pending";
      
      await apiRequest("PATCH", `/api/transactions/${transaction.id}`, {
        status: newStatus
      });
      
      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
      queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
      
      toast({
        title: "Status updated",
        description: `Transaction marked as ${newStatus}`,
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating transaction status:", error);
      toast({
        title: "Update failed",
        description: "Failed to update transaction status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Transactions</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button 
            variant={filter === "expense" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("expense")}
          >
            Expenses
          </Button>
          <Button 
            variant={filter === "income" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("income")}
          >
            Income
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
          {sortedTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              <LayoutList className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p>No transactions found</p>
            </div>
          ) : (
            sortedTransactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="p-3 flex justify-between items-center cursor-pointer hover:bg-slate-50"
                onClick={() => onTransactionClick(transaction)}
              >
                <div className="flex items-center">
                  <div 
                    className={`mr-3 rounded-full p-2 
                      ${transaction.status === 'pending' 
                        ? 'bg-red-100' 
                        : transaction.type === 'income' 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}
                    onClick={(e) => toggleTransactionStatus(transaction, e)}
                  >
                    {transaction.type === 'income' ? (
                      <LayoutList className="h-4 w-4 text-blue-600" />
                    ) : transaction.status === 'pending' ? (
                      <AlertCircle className="h-4 w-4 text-danger" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{transaction.description}</div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(transaction.date), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      transaction.status === 'pending'
                        ? 'bg-red-100 text-red-800'
                        : transaction.status === 'cleared'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
