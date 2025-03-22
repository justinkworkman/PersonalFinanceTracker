import { Card, CardContent } from "@/components/ui/card";
import { CategorySummary } from "@shared/schema";
import { formatCurrency } from "@/lib/utils";

interface CategoryCardProps {
  categories: CategorySummary[];
}

export default function CategoryCard({ categories }: CategoryCardProps) {
  // Take top 3 categories or all if less than 3
  const topCategories = categories.slice(0, 3);
  
  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Top Categories</h2>
        {topCategories.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-4">
            No expense categories this month
          </div>
        ) : (
          <div className="space-y-3">
            {topCategories.map((category, index) => (
              <div key={category.id} className="flex items-center">
                <div className="w-full mr-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{category.name}</span>
                    <span className="text-sm text-slate-500">{formatCurrency(category.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                    <div 
                      className={`${getCategoryColor(index)} h-1.5 rounded-full`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {Math.round(category.percentage)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Return different color classes for category bars based on index
function getCategoryColor(index: number): string {
  const colors = ["bg-primary", "bg-secondary", "bg-accent"];
  return colors[index % colors.length];
}
