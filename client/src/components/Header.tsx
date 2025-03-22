import { useState } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import MonthSelector from "@/components/MonthSelector";
import TransactionModal from "@/components/TransactionModal";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { addMonths, subMonths } from "date-fns";
import { useDateContext } from "@/context/DateContext";

export default function Header() {
  const { selectedDate, setSelectedDate } = useDateContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Create month navigation functions
  const prevMonth = () => {
    setSelectedDate(subMonths(selectedDate, 1));
  };
  
  const nextMonth = () => {
    setSelectedDate(addMonths(selectedDate, 1));
  };
  
  const goToMonth = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleAddTransaction = () => {
    setIsModalOpen(true);
  };
  
  const handleTransactionCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/transactions/month'] });
    queryClient.invalidateQueries({ queryKey: ['/api/summary'] });
    
    setIsModalOpen(false);
    toast({
      title: "Transaction created",
      description: "A new transaction has been added.",
      variant: "default",
    });
  };
  
  return (
    <header className="bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Desktop layout */}
        <div className="hidden md:flex justify-between items-center py-4">
          <Link href="/" className="text-2xl font-bold text-primary">
            BudgetTracker
          </Link>
          
          <MonthSelector 
            currentDate={selectedDate}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            goToMonth={goToMonth}
          />
          
          <Button
            onClick={handleAddTransaction}
            className="bg-primary hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Transaction
          </Button>
        </div>
        
        {/* Mobile layout */}
        <div className="md:hidden flex flex-col py-4 space-y-4">
          <div className="flex justify-between items-center w-full">
            <Link href="/" className="text-xl font-bold text-primary">
              BudgetTracker
            </Link>
            
            <MonthSelector 
              currentDate={selectedDate}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              goToMonth={goToMonth}
            />
          </div>
          
          <Button
            onClick={handleAddTransaction}
            className="bg-primary hover:bg-blue-700 text-white w-full"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Transaction
          </Button>
        </div>
      </div>
      
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTransactionCreated={handleTransactionCreated}
        transaction={null}
      />
    </header>
  );
}
