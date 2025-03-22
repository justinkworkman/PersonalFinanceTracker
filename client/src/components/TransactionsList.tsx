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
import { Transaction, TransactionWithMonthlyStatus } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUpdateMonthlyStatus } from "@/hooks/useTransactions";
import { useDateContext } from "@/context/DateContext";
import { useIsMobile } from "@/hooks/use-mobile";

interface TransactionsListProps {
  transactions: TransactionWithMonthlyStatus[];
  onTransactionClick: (transaction: TransactionWithMonthlyStatus) => void;
}

type FilterType = "all" | "expense" | "income";

export default function TransactionsList({ 
  transactions, 
  onTransactionClick
}: TransactionsListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDate } = useDateContext();
  const updateMonthlyStatus = useUpdateMonthlyStatus();
  const isMobile = useIsMobile();
  
  // Get current year and month from selected date
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth() + 1; // JavaScript months are 0-indexed
  
  // Apply filter to transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (filter === "all") return true;
    return transaction.type === filter;
  });
  
  // Sort transactions by date (newest first)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
  
  const toggleTransactionStatus = async (transaction: TransactionWithMonthlyStatus, event: React.MouseEvent) => {
    // Prevent the click from triggering the parent container's onClick
    event.stopPropagation();
    
    try {
      // Get current status and its monthly override if it exists
      const currentStatus = transaction.monthlyStatus?.status || transaction.status;
      
      // Toggle between pending and paid
      const newStatus = currentStatus === "pending" ? "paid" : "pending";
      
      // For recurring transactions or when viewing non-current months, 
      // use the monthly status API to update the status for this specific month
      const isCleared = false; // cleared is a separate state that requires explicit action
      
      // Update monthly status for this specific transaction in this month
      await updateMonthlyStatus.mutateAsync({
        transactionId: transaction.id,
        year: currentYear,
        month: currentMonth,
        status: newStatus,
        isCleared
      });
      
      toast({
        title: "Status updated",
        description: `Transaction marked as ${newStatus} for ${currentMonth}/${currentYear}`,
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
    <Card className={isMobile ? "w-full" : ""}>
      {/* Desktop header */}
      <CardHeader className={`${isMobile ? 'hidden' : 'flex'} flex-row items-center justify-between space-y-0 pb-2`}>
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
      
      {/* Mobile header */}
      <CardHeader className={`${isMobile ? 'flex' : 'hidden'} flex-col space-y-2 pb-2 pt-4 px-5`}>
        <CardTitle className="text-base font-semibold">Transactions</CardTitle>
        <div className="flex w-full space-x-1">
          <Button 
            variant={filter === "all" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1"
          >
            All
          </Button>
          <Button 
            variant={filter === "expense" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("expense")}
            className="flex-1"
          >
            Exp
          </Button>
          <Button 
            variant={filter === "income" ? "default" : "outline"} 
            size="sm"
            onClick={() => setFilter("income")}
            className="flex-1"
          >
            Inc
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
                className={`${isMobile ? 'p-2' : 'p-3'} flex justify-between items-center cursor-pointer hover:bg-slate-50`}
                onClick={() => onTransactionClick(transaction)}
              >
                <div className="flex items-center">
                  <div 
                    className={`${isMobile ? 'mr-2 p-1.5' : 'mr-3 p-2'} rounded-full 
                      ${(transaction.monthlyStatus?.status || transaction.status) === 'pending' 
                        ? 'bg-red-100' 
                        : transaction.type === 'income' 
                          ? 'bg-blue-100' 
                          : 'bg-green-100'
                      }`}
                    onClick={(e) => toggleTransactionStatus(transaction, e)}
                  >
                    {transaction.type === 'income' ? (
                      <LayoutList className="h-4 w-4 text-blue-600" />
                    ) : (transaction.monthlyStatus?.status || transaction.status) === 'pending' ? (
                      <AlertCircle className="h-4 w-4 text-danger" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-success" />
                    )}
                  </div>
                  <div className={isMobile ? 'mr-1' : ''}>
                    <div className={`${isMobile ? 'text-sm' : ''} font-medium text-slate-800 truncate ${isMobile ? 'max-w-[140px]' : ''}`}>
                      {transaction.description}
                    </div>
                    <div className="text-xs text-slate-500">
                      {format(new Date(transaction.date), isMobile ? "MM/dd" : "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`${isMobile ? 'text-sm' : ''} font-medium ${transaction.type === 'income' ? 'text-success' : 'text-danger'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      (transaction.monthlyStatus?.status || transaction.status) === 'pending'
                        ? 'bg-red-100 text-red-800'
                        : (transaction.monthlyStatus?.status || transaction.status) === 'cleared'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {isMobile ? 
                      ((transaction.monthlyStatus?.status || transaction.status).charAt(0).toUpperCase()) :
                      ((transaction.monthlyStatus?.status || transaction.status).charAt(0).toUpperCase() + 
                       (transaction.monthlyStatus?.status || transaction.status).slice(1))}
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
