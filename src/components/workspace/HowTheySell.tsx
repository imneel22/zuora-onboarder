import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, AlertTriangle, Filter } from "lucide-react";
import { toast } from "sonner";
import { SubscriptionEvidenceDrawer } from "./evidence/SubscriptionEvidenceDrawer";

interface Subscription {
  id: string;
  subscription_id: string;
  customer_id: string;
  start_date: string;
  end_date: string | null;
  termed: boolean;
  evergreen: boolean;
  has_cancellation: boolean;
  has_ramps: boolean;
  has_discounts: boolean;
  billing_period: string;
  currency: string;
  status: string;
  audited: boolean;
  derivation_trace: any;
  sot_snapshot_hash: string | null;
  conflict_flags: string[];
  confidence: number | null;
  audited_by: string | null;
  audited_at: string | null;
}

export const HowTheySell = ({ customerId }: { customerId: string }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("standard");

  useEffect(() => {
    fetchUserRole();
    fetchSubscriptions();
  }, [customerId]);

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      if (data) setUserRole(data.role);
    }
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customerId)
      .order("start_date", { ascending: false });

    if (error) {
      toast.error("Failed to load subscriptions");
      console.error(error);
    } else {
      setSubscriptions(data || []);
    }
    setLoading(false);
  };

  const toggleAudited = async (subscriptionId: string, currentAudited: boolean) => {
    const { error } = await supabase
      .from("subscriptions")
      .update({ audited: !currentAudited })
      .eq("id", subscriptionId);

    if (error) {
      toast.error("Failed to update subscription");
    } else {
      toast.success("Subscription updated");
      fetchSubscriptions();
    }
  };

  let filteredSubscriptions = subscriptions.filter((sub) =>
    sub.subscription_id.toLowerCase().includes(search.toLowerCase()) ||
    sub.billing_period.toLowerCase().includes(search.toLowerCase())
  );

  // Apply additional filters
  if (filterBy === "low_confidence") {
    filteredSubscriptions = filteredSubscriptions.filter(sub => (sub.confidence || 0) < 0.5);
  } else if (filterBy === "not_audited") {
    filteredSubscriptions = filteredSubscriptions.filter(sub => !sub.audited);
  } else if (filterBy === "conflicts") {
    filteredSubscriptions = filteredSubscriptions.filter(sub => sub.conflict_flags?.length > 0);
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/10 text-success border-success/20";
      case "cancelled":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "expired":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Calculate attribute counts
  const termed = subscriptions.filter(s => s.termed).length;
  const evergreen = subscriptions.filter(s => s.evergreen).length;
  const withCancellation = subscriptions.filter(s => s.has_cancellation).length;
  const withRamps = subscriptions.filter(s => s.has_ramps).length;
  const withDiscounts = subscriptions.filter(s => s.has_discounts).length;

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Subscription metadata and selling attributes
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{termed}</div>
            <div className="text-sm text-muted-foreground">Termed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{evergreen}</div>
            <div className="text-sm text-muted-foreground">Evergreen</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-accent">{withCancellation}</div>
            <div className="text-sm text-muted-foreground">Cancellation</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-accent">{withRamps}</div>
            <div className="text-sm text-muted-foreground">Ramps</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-accent">{withDiscounts}</div>
            <div className="text-sm text-muted-foreground">Discounts</div>
          </Card>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by..." />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="low_confidence">Low Confidence</SelectItem>
            <SelectItem value="not_audited">Not Audited</SelectItem>
            <SelectItem value="conflicts">Has Conflicts</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subscription ID</TableHead>
              <TableHead>Termed</TableHead>
              <TableHead>Evergreen</TableHead>
              <TableHead>Cancellation</TableHead>
              <TableHead>Ramps</TableHead>
              <TableHead>Discounts</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Conflicts</TableHead>
              <TableHead>Audited</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscriptions.map((sub) => (
              <TableRow 
                key={sub.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedSubscription(sub)}
              >
                <TableCell className="font-medium">{sub.subscription_id}</TableCell>
                <TableCell>
                  {sub.termed ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {sub.evergreen ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {sub.has_cancellation ? (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {sub.has_ramps ? (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {sub.has_discounts ? (
                    <CheckCircle className="h-4 w-4 text-accent" />
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{sub.billing_period}</Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      (sub.confidence || 0) >= 0.8 
                        ? "bg-success/10 text-success" 
                        : (sub.confidence || 0) >= 0.5 
                        ? "bg-warning/10 text-warning" 
                        : "bg-destructive/10 text-destructive"
                    }
                  >
                    {Math.round((sub.confidence || 0) * 100)}%
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(sub.status)}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {sub.conflict_flags?.length > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {sub.conflict_flags.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={sub.audited}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => toggleAudited(sub.id, sub.audited)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredSubscriptions.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No subscriptions found
        </div>
      )}

      <SubscriptionEvidenceDrawer
        subscription={selectedSubscription}
        open={!!selectedSubscription}
        onClose={() => setSelectedSubscription(null)}
        onUpdate={fetchSubscriptions}
        userRole={userRole}
      />
    </div>
  );
};