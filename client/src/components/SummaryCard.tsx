import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SummaryCardProps {
  income: number;
  expenses: number;
  remaining: number;
}

export default function SummaryCard({ income, expenses, remaining }: SummaryCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Monthly Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-slate-600">Income</span>
            <span className="font-medium text-success">{formatCurrency(income)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Expenses</span>
            <span className="font-medium text-danger">{formatCurrency(expenses)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Remaining</span>
              <span className="font-bold text-primary">{formatCurrency(remaining)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
