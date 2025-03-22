import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import SummaryCard from "@/components/SummaryCard";
import StatusCard from "@/components/StatusCard";
import CategoryCard from "@/components/CategoryCard";
import CalendarView from "@/components/CalendarView";
import TransactionsList from "@/components/TransactionsList";
import TransactionModal from "@/components/TransactionModal";
import { MonthlySummary, Transaction, TransactionWithMonthlyStatus } from "@shared/schema";
import { useCalendar } from "@/hooks/useCalendar";
import { useDateContext } from "@/context/DateContext";

export default function Dashboard() {
  // Use date context first (all hooks must be called in the same order)
  const { selectedDate, setSelectedDate } = useDateContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithMonthlyStatus | null>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Navigation functions for month
  const prevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };
  
  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };
  
  const goToMonth = (date: Date) => {
    setSelectedDate(date);
  };
  
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  
  // Query for monthly transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery<TransactionWithMonthlyStatus[]>({
    queryKey: ['/api/transactions/month', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Generate calendar weeks for current month
  const { calendarWeeks } = useCalendar(selectedDate, transactions);
  
  // Query for monthly summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery<MonthlySummary>({
    queryKey: ['/api/summary', year, month],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };
  
  const handleEditTransaction = (transaction: TransactionWithMonthlyStatus) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTransaction(null);
  };
  
  const handleTransactionCreated = () => {
    // Invalidate and refetch queries with exact year and month
    queryClient.invalidateQueries({ queryKey: ['/api/transactions/month', year, month] });
    queryClient.invalidateQueries({ queryKey: ['/api/summary', year, month] });
    
    // Also invalidate transactions for adjacent months, which might be affected by recurring transactions
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonthNumber = month === 12 ? 1 : month + 1;
    
    const prevMonthYear = month === 1 ? year - 1 : year;
    const prevMonthNumber = month === 1 ? 12 : month - 1;
    
    queryClient.invalidateQueries({ queryKey: ['/api/transactions/month', nextMonthYear, nextMonthNumber] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions/month', prevMonthYear, prevMonthNumber] });
    
    setIsModalOpen(false);
    setEditingTransaction(null); // Ensure editing transaction is reset
    
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
      <div className={`grid grid-cols-1 ${!isMobile ? 'lg:grid-cols-3' : ''} gap-6`}>
        {/* Only show calendar on non-mobile devices */}
        {!isMobile && (
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
        )}
        
        {/* Transaction list takes full width on mobile */}
        <div className={isMobile ? 'w-full' : ''}>
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
