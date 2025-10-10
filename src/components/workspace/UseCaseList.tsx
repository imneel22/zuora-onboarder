import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Circle, Plus } from "lucide-react";

interface Subscription {
  id: string;
  subscription_id: string;
  termed: boolean;
  evergreen: boolean;
  has_cancellation: boolean;
  has_ramps: boolean;
  has_discounts: boolean;
  billing_period: string;
  in_use_case_list: boolean;
}

interface CategoryCoverage {
  category: string;
  pob: string;
  covered: boolean;
  covering_subscriptions: string[];
}

interface AttributeCoverage {
  attribute: string;
  covered: boolean;
  covering_subscriptions: string[];
}

export const UseCaseList = ({ customerId }: { customerId: string }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [categories, setCategories] = useState<CategoryCoverage[]>([]);
  const [attributes, setAttributes] = useState<AttributeCoverage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([
      fetchSubscriptions(),
      fetchCategoryCoverage(),
      fetchAttributeCoverage()
    ]);
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customerId);

    if (error) {
      toast.error("Failed to load subscriptions");
      console.error(error);
      return;
    }

    // Mock in_use_case_list - in production this would come from a junction table
    const withUseCaseFlag = (data || []).map(sub => ({
      ...sub,
      in_use_case_list: false // Default false, user will add them
    }));
    
    setSubscriptions(withUseCaseFlag);
  };

  const fetchCategoryCoverage = async () => {
    // Get unique product categories from PRPC inferences
    const { data: prpcs, error } = await supabase
      .from("prpc_inferences")
      .select("inferred_product_category, inferred_pob")
      .eq("customer_id", customerId)
      .not("inferred_product_category", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    // Create unique category/pob combinations
    const uniqueCategories = new Map<string, { category: string; pob: string }>();
    (prpcs || []).forEach(prpc => {
      const key = `${prpc.inferred_product_category}|${prpc.inferred_pob}`;
      if (!uniqueCategories.has(key)) {
        uniqueCategories.set(key, {
          category: prpc.inferred_product_category!,
          pob: prpc.inferred_pob || "Unknown"
        });
      }
    });

    setCategories(
      Array.from(uniqueCategories.values()).map(cat => ({
        category: cat.category,
        pob: cat.pob,
        covered: false, // Will be calculated based on selected subscriptions
        covering_subscriptions: []
      }))
    );
  };

  const fetchAttributeCoverage = async () => {
    // Define the subscription attributes we want to cover
    const attributeTypes = [
      { attribute: "Termed", key: "termed" },
      { attribute: "Evergreen", key: "evergreen" },
      { attribute: "Has Cancellation", key: "has_cancellation" },
      { attribute: "Has Ramps", key: "has_ramps" },
      { attribute: "Has Discounts", key: "has_discounts" }
    ];

    setAttributes(
      attributeTypes.map(attr => ({
        attribute: attr.attribute,
        covered: false,
        covering_subscriptions: []
      }))
    );
  };

  const toggleSubscriptionInList = async (subscriptionId: string) => {
    const updated = subscriptions.map(sub =>
      sub.id === subscriptionId
        ? { ...sub, in_use_case_list: !sub.in_use_case_list }
        : sub
    );
    setSubscriptions(updated);
    
    // In production, persist this to a junction table
    toast.success(
      updated.find(s => s.id === subscriptionId)?.in_use_case_list
        ? "Added to use case list"
        : "Removed from use case list"
    );
  };

  const useCaseListSubscriptions = subscriptions.filter(s => s.in_use_case_list);

  // Calculate coverage based on selected subscriptions
  const categoryCoveragePercent = categories.length > 0 
    ? Math.round((categories.filter(c => c.covered).length / categories.length) * 100)
    : 0;

  const attributeCoveragePercent = attributes.length > 0
    ? Math.round((attributes.filter(a => a.covered).length / attributes.length) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading use case list...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Product Category Coverage</CardTitle>
            <CardDescription>
              {categories.filter(c => c.covered).length} of {categories.length} categories covered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={categoryCoveragePercent} className="h-2 mb-4" />
            <div className="space-y-2">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {cat.covered ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cat.covered ? "text-foreground" : "text-muted-foreground"}>
                    {cat.category} ({cat.pob})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Attribute Coverage</CardTitle>
            <CardDescription>
              {attributes.filter(a => a.covered).length} of {attributes.length} attributes covered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={attributeCoveragePercent} className="h-2 mb-4" />
            <div className="space-y-2">
              {attributes.map((attr, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  {attr.covered ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={attr.covered ? "text-foreground" : "text-muted-foreground"}>
                    {attr.attribute}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Use Case List ({useCaseListSubscriptions.length})</CardTitle>
          <CardDescription>
            Minimal set of subscriptions covering all product categories and subscription types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {useCaseListSubscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subscriptions added yet. Add subscriptions from the list below.
            </div>
          ) : (
            <div className="space-y-3">
              {useCaseListSubscriptions.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="font-medium">{sub.subscription_id}</div>
                        <div className="flex flex-wrap gap-2">
                          {sub.termed && <Badge variant="outline">Termed</Badge>}
                          {sub.evergreen && <Badge variant="outline">Evergreen</Badge>}
                          {sub.has_cancellation && <Badge variant="outline">Has Cancellation</Badge>}
                          {sub.has_ramps && <Badge variant="outline">Has Ramps</Badge>}
                          {sub.has_discounts && <Badge variant="outline">Has Discounts</Badge>}
                          <Badge variant="secondary">{sub.billing_period}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSubscriptionInList(sub.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            Add subscriptions to the use case list to improve coverage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {subscriptions
              .filter(s => !s.in_use_case_list)
              .map((sub) => (
                <div key={sub.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => toggleSubscriptionInList(sub.id)}
                    />
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{sub.subscription_id}</div>
                      <div className="flex flex-wrap gap-1">
                        {sub.termed && <Badge variant="outline" className="text-xs">Termed</Badge>}
                        {sub.evergreen && <Badge variant="outline" className="text-xs">Evergreen</Badge>}
                        {sub.has_cancellation && <Badge variant="outline" className="text-xs">Cancellation</Badge>}
                        {sub.has_ramps && <Badge variant="outline" className="text-xs">Ramps</Badge>}
                        {sub.has_discounts && <Badge variant="outline" className="text-xs">Discounts</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSubscriptionInList(sub.id)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))}
            {subscriptions.filter(s => !s.in_use_case_list).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                All subscriptions have been added to the use case list
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
