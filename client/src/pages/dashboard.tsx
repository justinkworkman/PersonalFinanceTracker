import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import SummaryCard from "@/components/SummaryCard";
import StatusCard from "@/components/StatusCard";
import CategoryCard from "@/components/CategoryCard";
import CalendarView from "@/components/CalendarView";
import TransactionsList from "@/components/TransactionsList";
import TransactionModal from "@/components/TransactionModal";
import { MonthlySummary, Transaction } from "@shared/schema";
import { useCalendar } from "@/hooks/useCalendar";

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  
  const { calendarWeeks, prevMonth, nextMonth, goToMonth } = useCalendar(selectedDate);
  
  // Query for monthly transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions/month', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Query for monthly summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery<MonthlySummary>({
    queryKey: ['/api/summary', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };
  
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };
  
  const handleTransactionCreated = () => {
    // Invalidate and refetch queries
    queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
    queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
    
    setIsModalOpen(false);
    toast({
      title: editingTransaction ? "Transaction updated" : "Transaction created",
      description: editingTransaction 
        ? "The transaction has been updated successfully." 
        : "A new transaction has been added.",
      variant: "default",
    });
  };
  
  if (isLoadingTransactions || isLoadingSummary) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <>
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard 
          income={summary?.income || 0} 
          expenses={summary?.expenses || 0} 
          remaining={summary?.remaining || 0} 
        />
        <StatusCard 
          totalTransactions={summary?.totalTransactions || 0}
          paidTransactions={summary?.paidTransactions || 0}
          pendingTransactions={summary?.pendingTransactions || 0}
          percentPaid={summary?.percentPaid || 0}
        />
        <CategoryCard categories={summary?.categories || []} />
      </div>
      
      {/* Calendar and Transactions List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarView 
            calendarWeeks={calendarWeeks}
            transactions={transactions || []}
            month={selectedDate.getMonth()}
            year={selectedDate.getFullYear()}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            goToMonth={goToMonth}
          />
        </div>
        <div>
          <TransactionsList 
            transactions={transactions || []} 
            onTransactionClick={handleEditTransaction}
          />
        </div>
      </div>
      
      {/* Transaction Modal */}
      <TransactionModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTransactionCreated={handleTransactionCreated}
        transaction={editingTransaction}
      />
    </>
  );
}
