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
    const [year, month] = value.split('-').map(Number);
    const newDate = new Date(year, month - 1);
    goToMonth(newDate);
  };

  return (
    <div className="flex items-center space-x-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={onPrevMonth}
        aria-label="Previous Month"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <Select
        value={`${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`}
        onValueChange={handleSelectChange}
      >
        <SelectTrigger className="w-36 font-medium">
          <SelectValue>{format(currentDate, "MMMM yyyy")}</SelectValue>
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
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
