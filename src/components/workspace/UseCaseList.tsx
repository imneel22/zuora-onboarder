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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

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
  termed: boolean;
  evergreen: boolean;
  has_ramps: boolean;
  has_discounts: boolean;
  billing_period: string;
  rate_plan: string;
  charge: string;
  category: string;
}

export const UseCaseList = ({ customerId }: { customerId: string }) => {
  const [useCaseItems, setUseCaseItems] = useState<UseCaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<UseCaseItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [customerId]);

  const fetchData = async () => {
    setLoading(true);
    await fetchUseCaseItems();
    setLoading(false);
  };

  const handleCountClick = (item: UseCaseItem) => {
    setSelectedItem(item);
    setDrawerOpen(true);
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
          use_case_id: `${useCaseCounter}`,
          product_type: category,
          triggering: Math.random() > 0.5 ? "Upon Booking" : "Upon Event",
          timing: Math.random() > 0.5 ? "Ratable" : "Immediate",
          count: Math.floor(Math.random() * 60) + 5,
          status: Math.random() > 0.5 ? "uploaded" : "pending",
          subscription_id: sub.subscription_id,
          termed: sub.termed,
          evergreen: sub.evergreen,
          has_ramps: sub.has_ramps,
          has_discounts: sub.has_discounts,
          billing_period: sub.billing_period,
          rate_plan: `RP-${useCaseCounter}`,
          charge: `Charge-${useCaseCounter}`,
          category: category
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
          use_case_id: `${useCaseCounter}`,
          product_type: type,
          triggering: "Upon Booking",
          timing: "Ratable",
          count: Math.floor(Math.random() * 50) + 10,
          status: Math.random() > 0.5 ? "uploaded" : "pending",
          subscription_id: sub.subscription_id,
          termed: sub.termed,
          evergreen: sub.evergreen,
          has_ramps: sub.has_ramps,
          has_discounts: sub.has_discounts,
          billing_period: sub.billing_period,
          rate_plan: `RP-${useCaseCounter}`,
          charge: `Charge-${useCaseCounter}`,
          category: type
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
    <>
      <Card>
        <CardHeader>
          <CardTitle>Use Case List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Use Case ID</TableHead>
                  <TableHead className="w-[150px]">Product Type</TableHead>
                  <TableHead className="w-[80px]">Termed</TableHead>
                  <TableHead className="w-[90px]">Evergreen</TableHead>
                  <TableHead className="w-[80px]">Ramps</TableHead>
                  <TableHead className="w-[90px]">Discount</TableHead>
                  <TableHead className="w-[100px]">Billing Type</TableHead>
                  <TableHead className="w-[80px] cursor-pointer hover:bg-muted/50">Count</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useCaseItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No use cases found. Add subscriptions and product categories to generate use cases.
                    </TableCell>
                  </TableRow>
                ) : (
                  useCaseItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-primary">
                        {item.use_case_id}
                      </TableCell>
                      <TableCell className="text-sm">{item.product_type}</TableCell>
                      <TableCell>
                        {item.termed ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.evergreen ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.has_ramps ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.has_discounts ? (
                          <Badge variant="default" className="text-xs">Yes</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{item.billing_period}</TableCell>
                      <TableCell 
                        className="font-semibold text-primary cursor-pointer hover:underline"
                        onClick={() => handleCountClick(item)}
                      >
                        {item.count}
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

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Use Case Details - {selectedItem?.use_case_id}</DrawerTitle>
            <DrawerDescription>
              Complete information for this use case
            </DrawerDescription>
          </DrawerHeader>
          {selectedItem && (
            <div className="px-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Subscription ID</div>
                  <div className="text-sm">{selectedItem.subscription_id}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Rate Plan</div>
                  <div className="text-sm">{selectedItem.rate_plan}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Charge</div>
                  <div className="text-sm">{selectedItem.charge}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Triggering</div>
                  <div className="text-sm">{selectedItem.triggering}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Timing</div>
                  <div className="text-sm">{selectedItem.timing}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Count</div>
                  <div className="text-sm font-semibold text-primary">{selectedItem.count}</div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">Attributes</div>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.termed && <Badge>Termed</Badge>}
                  {selectedItem.evergreen && <Badge>Evergreen</Badge>}
                  {selectedItem.has_ramps && <Badge>Has Ramps</Badge>}
                  {selectedItem.has_discounts && <Badge>Has Discounts</Badge>}
                  <Badge variant="secondary">{selectedItem.billing_period}</Badge>
                </div>
              </div>
            </div>
          )}
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};
