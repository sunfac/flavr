import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Activity } from "lucide-react";

interface AICostData {
  currentMonth: {
    month: string;
    totalCost: string;
    operationCounts: Record<string, number>;
    providerCosts: Record<string, string>;
  };
  lastMonth: {
    month: string;
    totalCost: string;
    operationCounts: Record<string, number>;
    providerCosts: Record<string, string>;
  };
  summary: {
    currentMonthTotal: number;
    lastMonthTotal: number;
    monthOverMonth: number;
  };
}

export default function AICostsDashboard() {
  const { data: costData, isLoading, error } = useQuery<AICostData>({
    queryKey: ["/api/developer/ai-costs"],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading AI Costs</h1>
          <p className="text-gray-600">Failed to fetch AI cost data. Please try again later.</p>
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">No Data Available</h1>
          <p className="text-gray-600">No AI cost data available yet.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const isIncreasing = costData.summary.monthOverMonth > 0;
  const changePercentage = costData.summary.lastMonthTotal > 0 
    ? ((costData.summary.monthOverMonth / costData.summary.lastMonthTotal) * 100).toFixed(1)
    : "0";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Costs Dashboard</h1>
          <p className="text-muted-foreground">
            Monthly AI spending analytics and usage patterns
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Developer Only
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costData.summary.currentMonthTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {costData.currentMonth.month}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Month</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costData.summary.lastMonthTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {costData.lastMonth.month}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month-over-Month</CardTitle>
            {isIncreasing ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${isIncreasing ? 'text-red-600' : 'text-green-600'}`}>
              {isIncreasing ? '+' : ''}{formatCurrency(Math.abs(costData.summary.monthOverMonth))}
            </div>
            <p className={`text-xs ${isIncreasing ? 'text-red-500' : 'text-green-500'}`}>
              {isIncreasing ? '+' : ''}{changePercentage}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Month Details */}
        <Card>
          <CardHeader>
            <CardTitle>Current Month Details</CardTitle>
            <CardDescription>
              Breakdown by provider and operation type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Provider Costs</h4>
              <div className="space-y-2">
                {Object.entries(costData.currentMonth.providerCosts).map(([provider, cost]) => (
                  <div key={provider} className="flex justify-between items-center">
                    <span className="capitalize text-sm">{provider}</span>
                    <span className="font-medium">${parseFloat(cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Operation Counts</h4>
              <div className="space-y-2">
                {Object.entries(costData.currentMonth.operationCounts).map(([operation, count]) => (
                  <div key={operation} className="flex justify-between items-center">
                    <span className="text-sm">{operation.replace(/-/g, ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Last Month Details */}
        <Card>
          <CardHeader>
            <CardTitle>Last Month Details</CardTitle>
            <CardDescription>
              Previous month for comparison
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Provider Costs</h4>
              <div className="space-y-2">
                {Object.entries(costData.lastMonth.providerCosts).map(([provider, cost]) => (
                  <div key={provider} className="flex justify-between items-center">
                    <span className="capitalize text-sm">{provider}</span>
                    <span className="font-medium">${parseFloat(cost).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Operation Counts</h4>
              <div className="space-y-2">
                {Object.entries(costData.lastMonth.operationCounts).map(([operation, count]) => (
                  <div key={operation} className="flex justify-between items-center">
                    <span className="text-sm">{operation.replace(/-/g, ' ')}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Management Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Cost Management Insights</CardTitle>
          <CardDescription>
            Tips to optimize AI spending
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">High Cost Operations</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Image generation ($0.04 per image)</li>
                <li>• Recipe generation with GPT-4o</li>
                <li>• Photo-to-recipe processing</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Optimization Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cache generated images when possible</li>
                <li>• Implement rate limiting for heavy operations</li>
                <li>• Monitor usage patterns by user tier</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}