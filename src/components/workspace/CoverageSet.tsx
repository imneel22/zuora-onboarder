import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Plus, X, Info, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface CoverageCandidate {
  id: string;
  subscription_id: string;
  covers_product_categories: string[];
  covers_attributes: string[];
  is_in_minimal_set: boolean;
  rationale: string | null;
  confidence: number | null;
  subscriptions: {
    subscription_id: string;
    billing_period: string;
    status: string;
  };
}

export const CoverageSet = ({ customerId }: { customerId: string }) => {
  const [candidates, setCandidates] = useState<CoverageCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  useEffect(() => {
    fetchCandidates();
  }, [customerId]);

  const fetchCandidates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_coverage_candidates")
      .select(`
        *,
        subscriptions (
          subscription_id,
          billing_period,
          status
        )
      `)
      .eq("customer_id", customerId)
      .order("is_in_minimal_set", { ascending: false });

    if (error) {
      toast.error("Failed to load coverage candidates");
      console.error(error);
    } else {
      setCandidates(data || []);
    }
    setLoading(false);
  };

  const toggleInSet = async (candidateId: string, currentInSet: boolean) => {
    const { error } = await supabase
      .from("subscription_coverage_candidates")
      .update({ is_in_minimal_set: !currentInSet })
      .eq("id", candidateId);

    if (error) {
      toast.error("Failed to update coverage set");
    } else {
      toast.success("Coverage set updated");
      fetchCandidates();
    }
  };

  const minimalSet = candidates.filter(c => c.is_in_minimal_set);
  
  // Calculate coverage percentages (mock calculation)
  const categoryCoverage = minimalSet.length > 0 ? Math.min(100, minimalSet.length * 25) : 0;
  const attributeCoverage = minimalSet.length > 0 ? Math.min(100, minimalSet.length * 20) : 0;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Minimal subscription set that covers all product categories and selling attributes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Product Category Coverage</CardTitle>
            <CardDescription>
              Coverage across all identified product categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{categoryCoverage}%</span>
            </div>
            <Progress value={categoryCoverage} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attribute Coverage</CardTitle>
            <CardDescription>
              Coverage across all selling attributes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{attributeCoverage}%</span>
            </div>
            <Progress value={attributeCoverage} className="h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Minimal Set</h3>
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              {minimalSet.length} subscriptions
            </Badge>
          </div>
          
          {minimalSet.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No subscriptions in minimal set
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {minimalSet.map((candidate) => (
                <Card key={candidate.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" />
                          <span className="font-medium">
                            {candidate.subscriptions.subscription_id}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {candidate.subscriptions.billing_period}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          {candidate.covers_product_categories.length} categories •{" "}
                          {candidate.covers_attributes.length} attributes
                        </div>

                        {candidate.rationale && (
                          <div className="mt-2 rounded bg-muted p-2 text-xs text-muted-foreground">
                            {candidate.rationale}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleInSet(candidate.id, candidate.is_in_minimal_set)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">All Subscriptions</h3>
            {userRole === "admin" && (
              <Button size="sm" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Recompute
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {candidates.filter(c => !c.is_in_minimal_set).map((candidate) => (
              <Card key={candidate.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {candidate.subscriptions.subscription_id}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {candidate.subscriptions.billing_period}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {candidate.covers_product_categories.length} categories •{" "}
                        {candidate.covers_attributes.length} attributes
                      </div>

                      {candidate.confidence && (
                        <Badge variant="outline" className="text-xs">
                          {Math.round(candidate.confidence * 100)}% match
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleInSet(candidate.id, candidate.is_in_minimal_set)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {candidates.filter(c => !c.is_in_minimal_set).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                All subscriptions are in the minimal set
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
