import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { PageLayout } from "@/components/PageLayout";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

const iconMap = {
  checkCircle: CheckCircle,
  alertCircle: AlertCircle,
  refreshCw: RefreshCw,
};

interface MigrationStatus {
  totalRecipes: number;
  expiredImages: number;
  localImages: number;
  needsMigration: boolean;
}

export default function ImageMigration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  // Check migration status
  const { data: migrationStatus, isLoading, refetch } = useQuery<MigrationStatus>({
    queryKey: ['/api/migration-status'],
    refetchInterval: isProcessing ? 2000 : false, // Poll while processing
  });

  // Migration mutation
  const migrationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/migrate-images', { method: 'POST' });
      if (!response.ok) throw new Error('Migration failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Migration Complete",
        description: "All DALL-E images have been downloaded and stored locally.",
      });
      setIsProcessing(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/user-recipes'] });
    },
    onError: (error) => {
      toast({
        title: "Migration Failed",
        description: error.message || "Failed to migrate images. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleMigration = () => {
    setIsProcessing(true);
    migrationMutation.mutate();
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </PageLayout>
    );
  }

  const progress = migrationStatus ? 
    ((migrationStatus.localImages / migrationStatus.totalRecipes) * 100) : 0;

  return (
    <PageLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-4">Image Migration</h1>
            <p className="text-gray-400 text-lg">
              Migrate DALL-E images to local storage for permanent availability
            </p>
          </div>

          {migrationStatus && (
            <div className="space-y-6">
              {/* Status Overview */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <iconMap.refreshCw className="h-5 w-5" />
                    Migration Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">
                        {migrationStatus.totalRecipes}
                      </div>
                      <div className="text-gray-400">Total Recipes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-400">
                        {migrationStatus.expiredImages}
                      </div>
                      <div className="text-gray-400">Expired Images</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">
                        {migrationStatus.localImages}
                      </div>
                      <div className="text-gray-400">Local Images</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Migration Progress</span>
                      <span className="text-white">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              {/* Migration Action */}
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-6">
                  {migrationStatus.needsMigration ? (
                    <div className="text-center space-y-4">
                      <iconMap.alertCircle className="h-12 w-12 text-orange-400 mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Migration Required
                        </h3>
                        <p className="text-gray-400 mb-4">
                          {migrationStatus.expiredImages} recipe images are using expired DALL-E URLs
                          and need to be downloaded for permanent storage.
                        </p>
                        <Badge variant="outline" className="text-orange-400 border-orange-400 mb-4">
                          Action Required
                        </Badge>
                      </div>
                      <Button
                        onClick={handleMigration}
                        disabled={isProcessing || migrationMutation.isPending}
                        className="bg-orange-500 hover:bg-orange-600 text-white"
                        size="lg"
                      >
                        {isProcessing || migrationMutation.isPending ? (
                          <>
                            <iconMap.refreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Migrating Images...
                          </>
                        ) : (
                          <>
                            Start Migration
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4">
                      <iconMap.checkCircle className="h-12 w-12 text-green-400 mx-auto" />
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                          Migration Complete
                        </h3>
                        <p className="text-gray-400 mb-4">
                          All recipe images are stored locally and will remain available permanently.
                        </p>
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          All Set
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}