import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MonthSelectorProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  goToMonth: (date: Date) => void;
}

export default function MonthSelector({ 
  currentDate, 
  onPrevMonth, 
  onNextMonth,
  goToMonth
}: MonthSelectorProps) {
  // Generate a list of months (6 months before and after current month)
  const monthOptions = Array.from({ length: 13 }, (_, i) => {
    const date = addMonths(new Date(currentDate.getFullYear(), currentDate.getMonth() - 6), i);
    return {
      value: `${date.getFullYear()}-${date.getMonth() + 1}`,
      label: format(date, "MMMM yyyy")
    };
  });

  const handleSelectChange = (value: string) => {
    try {
      const [year, month] = value.split('-').map(Number);
      const newDate = new Date(year, month - 1);
      console.log('MonthSelector - Calling goToMonth with:', newDate);
      console.log('goToMonth is:', typeof goToMonth);
      
      if (typeof goToMonth !== 'function') {
        console.error('goToMonth is not a function!', goToMonth);
        return;
      }
      
      goToMonth(newDate);
    } catch (error) {
      console.error('Error in handleSelectChange:', error);
    }
  };

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onPrevMonth}
        aria-label="Previous Month"
        className="flex-shrink-0"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Select
        value={`${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="w-[100px] md:w-36 font-medium">
          <SelectValue>{format(currentDate, "MMM yyyy")}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {monthOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onNextMonth}
        aria-label="Next Month"
        className="flex-shrink-0"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
