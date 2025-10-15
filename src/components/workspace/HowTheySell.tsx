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
import { Search, CheckCircle, AlertTriangle, Filter, LayoutGrid, Tag, Calendar, Percent, TrendingUp, Clock, FileText, RefreshCw, DollarSign, Package } from "lucide-react";
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
  const [viewMode, setViewMode] = useState<"overview" | "details">("overview");
  const [selectedAttribute, setSelectedAttribute] = useState<string | null>(null);

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
  const attributeStats = [
    { 
      key: 'has_discounts', 
      label: 'Discounts', 
      count: subscriptions.filter(s => s.has_discounts).length,
      icon: <Percent className="h-6 w-6 text-primary" />,
      color: "from-primary/20 to-primary/5"
    },
    { 
      key: 'termed', 
      label: 'Termed', 
      count: subscriptions.filter(s => s.termed).length,
      icon: <Calendar className="h-6 w-6 text-success" />,
      color: "from-success/20 to-success/5"
    },
    { 
      key: 'evergreen', 
      label: 'Evergreen', 
      count: subscriptions.filter(s => s.evergreen).length,
      icon: <RefreshCw className="h-6 w-6 text-accent" />,
      color: "from-accent/20 to-accent/5"
    },
    { 
      key: 'has_ramps', 
      label: 'Ramp Deals', 
      count: subscriptions.filter(s => s.has_ramps).length,
      icon: <TrendingUp className="h-6 w-6 text-warning" />,
      color: "from-warning/20 to-warning/5"
    },
    { 
      key: 'has_cancellation', 
      label: 'Termination Contracts', 
      count: subscriptions.filter(s => s.has_cancellation).length,
      icon: <AlertTriangle className="h-6 w-6 text-destructive" />,
      color: "from-destructive/20 to-destructive/5"
    },
  ];

  // Group by billing period for Term Length
  const termLengthGroups = subscriptions.reduce((acc, sub) => {
    acc[sub.billing_period] = (acc[sub.billing_period] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by currency
  const currencyGroups = subscriptions.reduce((acc, sub) => {
    acc[sub.currency] = (acc[sub.currency] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleAttributeClick = (attribute: string) => {
    setSelectedAttribute(attribute);
    setViewMode("details");
    setSearch("");
  };

  const handleBackToOverview = () => {
    setSelectedAttribute(null);
    setViewMode("overview");
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {selectedAttribute && (
            <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              Back to Overview
            </Button>
          )}
          <Button 
            variant={viewMode === "overview" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setViewMode("overview")}
            disabled={!!selectedAttribute}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </Button>
        </div>
        {selectedAttribute && (
          <p className="text-xs text-muted-foreground">
            Viewing: <span className="font-semibold text-foreground">{selectedAttribute}</span>
          </p>
        )}
      </div>

      {viewMode === "overview" ? (
        <div className="space-y-4">
          <Card className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-3xl font-bold text-primary">{subscriptions.length}</h3>
                <p className="text-xs font-semibold text-muted-foreground">Total Subscriptions</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attributeStats.map((stat) => (
              <Card 
                key={stat.key}
                className={`p-6 bg-gradient-to-br ${stat.color} hover:shadow-lg transition-all cursor-pointer hover:scale-105`}
                onClick={() => handleAttributeClick(stat.label)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {stat.icon}
                    <div>
                      <h4 className="font-semibold text-lg">{stat.label}</h4>
                      <p className="text-xs text-muted-foreground">Subscription Attribute</p>
                    </div>
                  </div>
                </div>

                <div className="bg-background/50 rounded-lg p-3 mb-3">
                  <p className="text-3xl font-bold text-primary">{stat.count}</p>
                  <p className="text-xs text-muted-foreground">Subscriptions</p>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Click to view details →
                  </p>
                </div>
              </Card>
            ))}

            {/* Term Length Card */}
            <Card 
              className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-500/5 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
              onClick={() => handleAttributeClick("Term Length")}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-blue-500" />
                  <div>
                    <h4 className="font-semibold text-lg">Term Length</h4>
                    <p className="text-xs text-muted-foreground">Billing Periods</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {Object.entries(termLengthGroups).slice(0, 3).map(([period, count]) => (
                  <div key={period} className="bg-background/50 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-xs font-medium">{period}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Click to view details →
                </p>
              </div>
            </Card>

            {/* Currency Card */}
            <Card 
              className="p-6 bg-gradient-to-br from-green-500/20 to-green-500/5 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
              onClick={() => handleAttributeClick("Currency")}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-green-500" />
                  <div>
                    <h4 className="font-semibold text-lg">Currency</h4>
                    <p className="text-xs text-muted-foreground">Payment Currencies</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                {Object.entries(currencyGroups).slice(0, 3).map(([currency, count]) => (
                  <div key={currency} className="bg-background/50 rounded-lg p-2 flex justify-between items-center">
                    <span className="text-xs font-medium">{currency}</span>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Click to view details →
                </p>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
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
                  <TableHead>Currency</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conflicts</TableHead>
                  <TableHead>Audited</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions
                  .filter(sub => {
                    if (!selectedAttribute) return true;
                    if (selectedAttribute === "Discounts") return sub.has_discounts;
                    if (selectedAttribute === "Termed") return sub.termed;
                    if (selectedAttribute === "Evergreen") return sub.evergreen;
                    if (selectedAttribute === "Ramp Deals") return sub.has_ramps;
                    if (selectedAttribute === "Termination Contracts") return sub.has_cancellation;
                    return true;
                  })
                  .map((sub) => (
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
                        <Badge variant="outline">{sub.currency}</Badge>
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
        </>
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