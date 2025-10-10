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
    const subs = await fetchSubscriptions();
    await fetchCategoryCoverage(subs);
    fetchAttributeCoverage(subs);
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
      return [];
    }

    // Compute minimal set: select subscriptions that maximize coverage
    const subsData = data || [];
    const minimalSet = computeMinimalSet(subsData);
    
    const withUseCaseFlag = subsData.map(sub => ({
      ...sub,
      in_use_case_list: minimalSet.has(sub.id)
    }));
    
    setSubscriptions(withUseCaseFlag);
    return withUseCaseFlag;
  };

  const computeMinimalSet = (subs: any[]): Set<string> => {
    // Attributes to cover
    const attributesToCover = ['termed', 'evergreen', 'has_cancellation', 'has_ramps', 'has_discounts'];
    const covered = new Set<string>();
    const selected = new Set<string>();

    // Greedy algorithm: pick subscriptions that cover the most uncovered attributes
    while (covered.size < attributesToCover.length && subs.length > 0) {
      let bestSub: any = null;
      let bestCoverage = 0;

      for (const sub of subs) {
        if (selected.has(sub.id)) continue;
        
        let coverageCount = 0;
        for (const attr of attributesToCover) {
          if (!covered.has(attr) && sub[attr] === true) {
            coverageCount++;
          }
        }

        if (coverageCount > bestCoverage) {
          bestCoverage = coverageCount;
          bestSub = sub;
        }
      }

      if (!bestSub || bestCoverage === 0) break;

      selected.add(bestSub.id);
      for (const attr of attributesToCover) {
        if (bestSub[attr] === true) {
          covered.add(attr);
        }
      }
    }

    // Ensure we have at least one subscription for diversity
    if (selected.size === 0 && subs.length > 0) {
      selected.add(subs[0].id);
    }

    return selected;
  };

  const fetchCategoryCoverage = async (subs: Subscription[]) => {
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

    const useCaseSubs = subs.filter(s => s.in_use_case_list);

    setCategories(
      Array.from(uniqueCategories.values()).map(cat => ({
        category: cat.category,
        pob: cat.pob,
        covered: useCaseSubs.length > 0, // Covered if at least one subscription in use case list
        covering_subscriptions: useCaseSubs.map(s => s.subscription_id)
      }))
    );
  };

  const fetchAttributeCoverage = (subs: Subscription[]) => {
    // Define the subscription attributes we want to cover
    const attributeTypes = [
      { attribute: "Termed", key: "termed" as keyof Subscription },
      { attribute: "Evergreen", key: "evergreen" as keyof Subscription },
      { attribute: "Has Cancellation", key: "has_cancellation" as keyof Subscription },
      { attribute: "Has Ramps", key: "has_ramps" as keyof Subscription },
      { attribute: "Has Discounts", key: "has_discounts" as keyof Subscription }
    ];

    const useCaseSubs = subs.filter(s => s.in_use_case_list);

    setAttributes(
      attributeTypes.map(attr => {
        const coveringSubs = useCaseSubs.filter(sub => sub[attr.key] === true);
        return {
          attribute: attr.attribute,
          covered: coveringSubs.length > 0,
          covering_subscriptions: coveringSubs.map(s => s.subscription_id)
        };
      })
    );
  };

  const toggleSubscriptionInList = async (subscriptionId: string) => {
    const updated = subscriptions.map(sub =>
      sub.id === subscriptionId
        ? { ...sub, in_use_case_list: !sub.in_use_case_list }
        : sub
    );
    setSubscriptions(updated);
    
    // Recalculate coverage
    await fetchCategoryCoverage(updated);
    fetchAttributeCoverage(updated);
    
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
