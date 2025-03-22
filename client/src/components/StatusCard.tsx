import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  return (
    <Card className={isMobile ? 'shadow-sm w-full' : ''}>
      <CardContent className={`${isMobile ? 'pt-4 px-5 pb-3' : 'pt-6'}`}>
        <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-slate-700 ${isMobile ? 'mb-3' : 'mb-4'}`}>
          Payment Status
        </h2>
        <div className={`space-y-${isMobile ? '3' : '4'}`}>
          <div className="flex items-center gap-2">
            <Progress value={safePercent} className="w-full" />
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600 whitespace-nowrap`}>
              {safePercent}% Paid
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded bg-slate-100`}>
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-primary`}>{totalTransactions}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded bg-green-50`}>
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-success`}>{paidTransactions}</div>
              <div className="text-xs text-slate-500">Paid</div>
            </div>
            <div className={`${isMobile ? 'p-1.5' : 'p-2'} rounded bg-red-50`}>
              <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-danger`}>{pendingTransactions}</div>
              <div className="text-xs text-slate-500">Pending</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
