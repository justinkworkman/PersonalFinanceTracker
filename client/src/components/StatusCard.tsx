import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface StatusCardProps {
  totalTransactions: number;
  paidTransactions: number;
  pendingTransactions: number;
  percentPaid: number;
}

export default function StatusCard({ 
  totalTransactions, 
  paidTransactions, 
  pendingTransactions, 
  percentPaid 
}: StatusCardProps) {
  // Ensure percent is between 0-100 and rounded
  const safePercent = Math.min(Math.max(0, Math.round(percentPaid)), 100);
  
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Payment Status</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Progress value={safePercent} className="w-full" />
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
              {safePercent}% Paid
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded bg-slate-100">
              <div className="text-xl font-bold text-primary">{totalTransactions}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className="p-2 rounded bg-green-50">
              <div className="text-xl font-bold text-success">{paidTransactions}</div>
              <div className="text-xs text-slate-500">Paid</div>
            </div>
            <div className="p-2 rounded bg-red-50">
              <div className="text-xl font-bold text-danger">{pendingTransactions}</div>
              <div className="text-xs text-slate-500">Pending</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
