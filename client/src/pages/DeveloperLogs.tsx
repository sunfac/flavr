import { useQuery, useMutation } from "@tanstack/react-query";
import { Clock, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { iconMap } from "@/lib/iconMap";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface DeveloperLog {
  id: number;
  userId: number;
  mode: string;
  quizInputs: Record<string, any>;
  promptSent: string;
  gptResponse: string;
  expectedOutput: Record<string, any>;
  actualOutput: Record<string, any>;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: string;
  matchStatus: boolean;
  discrepancies: string[] | null;
  imagePrompt?: string;
  imageGenerated?: boolean;
  imageUrl?: string;
  imageCost?: string;
  createdAt: string;
}

export default function DeveloperLogs() {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const { toast } = useToast();

  // Get current user data
  const { data: userData } = useQuery({
    queryKey: ["/api/me"],
    retry: false,
  });

  const user = userData?.user;

  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ["/api/developer-logs"],
    enabled: user?.email === "william@blycontracting.co.uk",
  });

  // Fetch all recipes for developer view
  const { data: recipes = [], isLoading: recipesLoading, refetch: refetchRecipes } = useQuery({
    queryKey: ['/api/recipes/all'],
    enabled: user?.email === "william@blycontracting.co.uk",
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/recipes/all");
      return response.json();
    }
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: async (recipeId: string) => {
      await apiRequest("DELETE", `/api/recipes/${recipeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/recipes/all'] });
      toast({
        title: "Recipe deleted",
        description: "Recipe has been removed from the database",
      });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete recipe",
        variant: "destructive",
      });
    }
  });

  const logs: DeveloperLog[] = (logsData as any)?.logs || [];

  // Filter recipes based on search term
  const filteredRecipes = recipes.filter((recipe: any) =>
    recipe.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.mode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewRecipe = (recipe: any) => {
    setSelectedRecipe(recipe);
  };

  const handleDeleteRecipe = (recipeId: string) => {
    if (confirm("Are you sure you want to delete this recipe? This action cannot be undone.")) {
      deleteRecipeMutation.mutate(recipeId);
    }
  };

  // Check if user has admin access
  if (!user || user.email !== "william@blycontracting.co.uk") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            {<span>🔧</span>}
            <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600 text-center">This section is only available to authorized administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const totalCost = logs.reduce((sum, log) => {
    const cost = parseFloat(log.estimatedCost.replace('$', ''));
    return sum + cost;
  }, 0);

  const totalTokens = logs.reduce((sum, log) => sum + log.inputTokens + log.outputTokens, 0);
  const matchRate = logs.length > 0 ? (logs.filter(log => log.matchStatus).length / logs.length * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center space-y-4 p-6">
            {<span>🔧</span>}
            <h1 className="text-xl font-bold text-gray-900">Error Loading Logs</h1>
            <p className="text-gray-600 text-center">Failed to fetch developer logs. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {<Database className="h-6 w-6 text-orange-500" />}
              Developer Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                {<span>🔧</span>}
                <div>
                  <p className="text-sm text-gray-600">Total Cost</p>
                  <p className="text-lg font-bold">${totalCost.toFixed(6)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {<Clock className="h-5 w-5 text-blue-500" />}
                <div>
                  <p className="text-sm text-gray-600">Total Tokens</p>
                  <p className="text-lg font-bold">{totalTokens.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {<span>🔧</span>}
                <div>
                  <p className="text-sm text-gray-600">Match Rate</p>
                  <p className="text-lg font-bold">{matchRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {<Database className="h-5 w-5 text-purple-500" />}
                <div>
                  <p className="text-sm text-gray-600">Total Logs</p>
                  <p className="text-lg font-bold">{logs.length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle>GPT Interaction Logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <>
                      <TableRow 
                        key={log.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell>
                          {React.createElement(iconMap.chevronDown, { className={`h-4 w-4 transition-transform ${
                              expandedRows.has(log.id) ? 'rotate-180' : ''
                            }`}
                          / })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.mode === 'shopping' ? 'default' : log.mode === 'fridge' ? 'secondary' : 'outline'}>
                            {log.mode}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">#{log.userId}</TableCell>
                        <TableCell className="text-sm">
                          {(log.inputTokens + log.outputTokens).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm font-mono">
                          {log.estimatedCost}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.imageGenerated ? (
                            <div className="flex items-center space-x-1">
                              {<span>🔧</span>}
                              <span className="text-xs text-green-600 font-mono">{log.imageCost}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.matchStatus ? 'default' : 'destructive'}>
                            {log.matchStatus ? '✅' : '❌'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.discrepancies && log.discrepancies.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {log.discrepancies.length} issues
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                      
                      {expandedRows.has(log.id) && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-gray-50">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Quiz Inputs</h4>
                                  <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-32 text-gray-900 font-mono border-gray-300 shadow-sm">
                                    {JSON.stringify(log.quizInputs, null, 2)}
                                  </pre>
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-gray-900">Expected vs Actual</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-xs font-medium text-green-700 block mb-1">Expected:</span>
                                      <pre className="text-xs bg-green-50 p-3 rounded border overflow-auto max-h-24 text-gray-900 font-mono border-green-200">
                                        {JSON.stringify(log.expectedOutput, null, 2)}
                                      </pre>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-blue-700 block mb-1">Actual:</span>
                                      <pre className="text-xs bg-blue-50 p-3 rounded border overflow-auto max-h-24 text-gray-900 font-mono border-blue-200">
                                        {JSON.stringify(log.actualOutput, null, 2)}
                                      </pre>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {log.discrepancies && log.discrepancies.length > 0 && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-red-600">Discrepancies</h4>
                                  <ul className="text-xs space-y-1">
                                    {log.discrepancies.map((disc, idx) => (
                                      <li key={idx} className="text-red-600">• {disc}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {log.imageGenerated && (
                                <div>
                                  <h4 className="font-semibold text-sm mb-2 text-purple-700">Stable Diffusion Image Generation</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <span className="text-xs font-medium text-purple-600 block mb-1">Image Prompt:</span>
                                      <pre className="text-xs bg-purple-50 p-3 rounded border overflow-auto max-h-20 text-gray-900 font-mono border-purple-200">
                                        {log.imagePrompt}
                                      </pre>
                                    </div>
                                    {log.imageUrl && (
                                      <div>
                                        <span className="text-xs font-medium text-purple-600 block mb-1">Generated Image:</span>
                                        <img 
                                          src={log.imageUrl} 
                                          alt="Generated recipe" 
                                          className="w-32 h-32 object-cover rounded border border-purple-200"
                                        />
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-4 text-xs">
                                      <span className="text-purple-600">Cost: <span className="font-mono font-medium">{log.imageCost}</span></span>
                                      <span className="text-green-600">✅ Successfully Generated</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              <Collapsible>
                                <CollapsibleTrigger className="text-sm font-semibold text-blue-600 hover:text-blue-800">
                                  View Full Prompt & Response ↓
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-4 space-y-4">
                                  <div>
                                    <span className="text-sm font-medium text-gray-800 block mb-2">Prompt Sent:</span>
                                    <pre className="text-xs bg-yellow-50 p-4 rounded-lg border border-yellow-200 overflow-auto max-h-64 text-gray-900 font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
                                      {log.promptSent}
                                    </pre>
                                  </div>
                                  <div>
                                    <span className="text-sm font-medium text-gray-800 block mb-2">GPT Response:</span>
                                    <pre className="text-xs bg-purple-50 p-4 rounded-lg border border-purple-200 overflow-auto max-h-64 text-gray-900 font-mono whitespace-pre-wrap leading-relaxed shadow-sm">
                                      {log.gptResponse}
                                    </pre>
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}