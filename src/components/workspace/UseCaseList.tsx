import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  covered_categories?: Set<string>;
}

interface UseCaseItem {
  id: string;
  use_case_id: string;
  product_type: string;
  triggering: string;
  timing: string;
  count: number;
  status: 'pending' | 'uploaded';
  subscription_id: string;
}

export const UseCaseList = ({ customerId }: { customerId: string }) => {
  const [useCaseItems, setUseCaseItems] = useState<UseCaseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    await fetchUseCaseItems();
    setLoading(false);
  };

  const fetchUseCaseItems = async () => {
    // Fetch subscriptions and PRPC inferences
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customerId);

    if (subError) {
      toast.error("Failed to load data");
      console.error(subError);
      return;
    }

    const { data: prpcs } = await supabase
      .from("prpc_inferences")
      .select("inferred_product_category, inferred_pob")
      .eq("customer_id", customerId)
      .not("inferred_product_category", "is", null);

    // Generate use case items from subscriptions and categories
    const items: UseCaseItem[] = [];
    let useCaseCounter = 1;

    // Get unique categories
    const uniqueCategories = new Set<string>();
    (prpcs || []).forEach(prpc => {
      if (prpc.inferred_product_category) {
        uniqueCategories.add(prpc.inferred_product_category);
      }
    });

    // Get unique subscription types
    const subscriptionTypes = new Set<string>();
    (subscriptions || []).forEach(sub => {
      if (sub.termed) subscriptionTypes.add("termed");
      if (sub.evergreen) subscriptionTypes.add("evergreen");
      if (sub.has_ramps) subscriptionTypes.add("ramps");
      if (sub.has_cancellation) subscriptionTypes.add("cancellation");
      if (sub.has_discounts) subscriptionTypes.add("discounts");
    });

    // Create use case items for each category
    Array.from(uniqueCategories).forEach(category => {
      const sub = subscriptions?.[0];
      if (sub) {
        items.push({
          id: `uc-${useCaseCounter}`,
          use_case_id: `G${useCaseCounter}`,
          product_type: category,
          triggering: Math.random() > 0.5 ? "Upon Booking" : "Upon Event",
          timing: Math.random() > 0.5 ? "Ratable" : "Immediate",
          count: Math.floor(Math.random() * 60) + 5,
          status: Math.random() > 0.5 ? "uploaded" : "pending",
          subscription_id: sub.subscription_id
        });
        useCaseCounter++;
      }
    });

    // Add items for subscription attribute variations
    const attributeTypes = [
      { type: "Termed Subscription", attr: "termed" },
      { type: "Evergreen Subscription", attr: "evergreen" },
      { type: "Subscription with Ramps", attr: "has_ramps" },
      { type: "Subscription with Cancellation", attr: "has_cancellation" },
      { type: "Subscription with Discounts", attr: "has_discounts" }
    ];

    attributeTypes.forEach(({ type, attr }) => {
      const sub = (subscriptions || []).find((s: any) => s[attr] === true);
      if (sub) {
        items.push({
          id: `uc-${useCaseCounter}`,
          use_case_id: `G${useCaseCounter}`,
          product_type: type,
          triggering: "Upon Booking",
          timing: "Ratable",
          count: Math.floor(Math.random() * 50) + 10,
          status: Math.random() > 0.5 ? "uploaded" : "pending",
          subscription_id: sub.subscription_id
        });
        useCaseCounter++;
      }
    });

    setUseCaseItems(items);
  };

  const handleUpload = (useCaseId: string) => {
    toast.success(`Upload initiated for ${useCaseId}`);
  };

  const handleView = (useCaseId: string) => {
    toast.info(`Viewing details for ${useCaseId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading use case list...</div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Use Case List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Use Case ID</TableHead>
                <TableHead className="w-[200px]">Product Type</TableHead>
                <TableHead>Triggering & Timing</TableHead>
                <TableHead className="w-[100px]">Count</TableHead>
                <TableHead className="w-[150px]">Waterfall Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {useCaseItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No use cases found. Add subscriptions and product categories to generate use cases.
                  </TableCell>
                </TableRow>
              ) : (
                useCaseItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-primary">
                      {item.use_case_id}
                    </TableCell>
                    <TableCell>{item.product_type}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="w-fit text-xs">
                          {item.triggering}
                        </Badge>
                        <Badge variant="outline" className="w-fit text-xs">
                          {item.timing}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-primary">
                        {item.count}
                      </span>
                    </TableCell>
                    <TableCell>
                      {item.status === "uploaded" ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                          <span className="mr-1">✓</span> Uploaded
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <span className="mr-1">⦿</span> Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === "uploaded" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(item.use_case_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpload(item.use_case_id)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
