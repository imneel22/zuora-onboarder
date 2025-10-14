import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, AlertTriangle, Filter, LayoutGrid, List, Package, TrendingUp, Cloud, Cpu, Code, Sparkles, Layers, Gift, Users, Briefcase, HeadphonesIcon, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { PRPCEvidenceDrawer } from "./evidence/PRPCEvidenceDrawer";

interface PRPCInference {
  id: string;
  prpc_id: string;
  product_name: string;
  rate_plan_name: string;
  charge_name: string;
  inferred_product_category: string | null;
  inferred_pob: string | null;
  rationale: string | null;
  confidence: number | null;
  status: string;
  source_agent: string | null;
  evidence_refs: any;
  explanation_vector: any;
  conflict_flags: string[];
  needs_review: boolean;
  last_reviewed_by: string | null;
  last_reviewed_at: string | null;
}

interface CategoryStats {
  category: string;
  prpcCount: number;
  subscriptionCount: number;
  avgConfidence: number;
  approvalRate: number;
  needsReview?: number;
  lowConfidence?: number;
  mediumConfidence?: number;
  highConfidence?: number;
}

export const WhatTheySell = ({ customerId }: { customerId: string }) => {
  const [inferences, setInferences] = useState<PRPCInference[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInference, setSelectedInference] = useState<PRPCInference | null>(null);
  const [filterBy, setFilterBy] = useState<string>("low");
  const [userRole, setUserRole] = useState<string>("standard");
  const [viewMode, setViewMode] = useState<"overview" | "details">("overview");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    console.log("Component mounted, customer ID:", customerId);
    fetchUserRole();
    fetchInferences();
    fetchCategoryStats();
  }, [customerId]);

  // Refetch when category changes (including when going back to overview)
  useEffect(() => {
    fetchInferences();
  }, [selectedCategory]);

  // Refresh when switching to overview
  useEffect(() => {
    if (viewMode === 'overview') {
      console.log("Switching to overview mode");
      fetchCategoryStats();
    }
  }, [viewMode]);

  useEffect(() => {
    console.log("Category stats updated:", categoryStats.length, "categories", categoryStats);
  }, [categoryStats]);

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

  const fetchInferences = async () => {
    setLoading(true);
    
    let query = supabase
      .from("prpc_inferences")
      .select("*")
      .eq("customer_id", customerId);
    
    // If viewing a specific category, filter in the query
    if (selectedCategory) {
      query = query.eq("inferred_product_category", selectedCategory);
    }
    
    const { data, error } = await query
      .order("product_name")
      .limit(10000);

    if (error) {
      toast.error("Failed to load inferences");
      console.error(error);
    } else {
      console.log("Fetched inferences:", data?.length, "for category:", selectedCategory || "all");
      setInferences(data || []);
    }
    setLoading(false);
  };

  const fetchCategoryStats = async () => {
    // Use database function for efficient aggregation
    const { data, error } = await supabase
      .rpc('get_category_stats', { p_customer_id: customerId });

    if (error) {
      console.error("Category stats error:", error);
      return;
    }

    console.log("Category Stats from DB:", data);

    const stats = data?.map((row: any) => ({
      category: row.category,
      prpcCount: parseInt(row.prpc_count),
      subscriptionCount: parseInt(row.subscription_count),
      avgConfidence: parseFloat(row.avg_confidence || 0),
      approvalRate: parseFloat(row.approval_rate || 0),
      needsReview: parseInt(row.needs_review_count),
      lowConfidence: parseInt(row.low_confidence_count),
      mediumConfidence: parseInt(row.medium_confidence_count),
      highConfidence: parseInt(row.high_confidence_count),
    })) || [];

    console.log("Processed stats:", stats);
    console.log("Categories found:", stats.map((s: any) => s.category));
    setCategoryStats(stats);
  };

  let filteredInferences = inferences.filter((inf) =>
    inf.product_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.rate_plan_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.charge_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_product_category?.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_pob?.toLowerCase().includes(search.toLowerCase())
  );

  console.log("Total inferences:", inferences.length);
  console.log("After search filter:", filteredInferences.length);
  console.log("Selected category:", selectedCategory);
  console.log("Filter by:", filterBy);

  // Don't filter by category here since we already filtered in the database query

  // Apply additional filters
  if (filterBy === "low") {
    filteredInferences = filteredInferences.filter(inf => (inf.confidence || 0) < 0.4);
    console.log("After low confidence filter:", filteredInferences.length);
  } else if (filterBy === "medium") {
    filteredInferences = filteredInferences.filter(inf => {
      const conf = inf.confidence || 0;
      return conf >= 0.4 && conf < 0.7;
    });
    console.log("After medium confidence filter:", filteredInferences.length);
  } else if (filterBy === "high") {
    filteredInferences = filteredInferences.filter(inf => (inf.confidence || 0) >= 0.7);
    console.log("After high confidence filter:", filteredInferences.length);
  } else if (filterBy === "conflicts") {
    filteredInferences = filteredInferences.filter(inf => inf.conflict_flags?.length > 0);
  } else if (filterBy === "needs_review") {
    filteredInferences = filteredInferences.filter(inf => inf.needs_review);
  } else if (filterBy === "not_approved") {
    filteredInferences = filteredInferences.filter(inf => inf.status !== "approved");
  }

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setViewMode("details");
    setSearch("");
    setFilterBy("low");
  };

  const handleBackToOverview = () => {
    setSelectedCategory(null);
    setViewMode("overview");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-success/10 text-success border-success/20";
      case "user_adjusted":
        return "bg-accent/10 text-accent border-accent/20";
      case "inferred":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getConfidenceBadge = (confidence: number | null) => {
    if (!confidence) return null;
    
    const level = confidence >= 0.7 ? "high" : confidence >= 0.4 ? "medium" : "low";
    const colors = {
      high: "bg-success/10 text-success border-success/20",
      medium: "bg-warning/10 text-warning border-warning/20",
      low: "bg-destructive/10 text-destructive border-destructive/20",
    };

    return (
      <Badge variant="outline" className={colors[level]}>
        {Math.round(confidence * 100)}%
      </Badge>
    );
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  const getCategoryColor = (index: number) => {
    const colors = [
      "from-primary/20 to-primary/5",
      "from-accent/20 to-accent/5",
      "from-success/20 to-success/5",
      "from-warning/20 to-warning/5",
    ];
    return colors[index % colors.length];
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "saas":
        return <Cloud className="h-6 w-6 text-primary" />;
      case "hardware":
        return <Cpu className="h-6 w-6 text-success" />;
      case "tech":
        return <Code className="h-6 w-6 text-accent" />;
      case "hybrid":
        return <Sparkles className="h-6 w-6 text-warning" />;
      case "services":
        return <Users className="h-6 w-6 text-blue-500" />;
      case "consulting":
        return <Briefcase className="h-6 w-6 text-indigo-500" />;
      case "support":
        return <HeadphonesIcon className="h-6 w-6 text-green-500" />;
      case "training":
        return <GraduationCap className="h-6 w-6 text-orange-500" />;
      case "tiered":
        return <Layers className="h-6 w-6 text-purple-500" />;
      case "freemium":
        return <Gift className="h-6 w-6 text-pink-500" />;
      default:
        return <Package className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {selectedCategory && (
            <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              Back to Overview
            </Button>
          )}
          <Button
            variant={viewMode === "overview" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("overview")}
            disabled={!!selectedCategory}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </Button>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            PRPC-level product categorization and POB mapping with AI rationale
          </p>
          {selectedCategory && (
            <p className="text-xs text-muted-foreground mt-1">
              Viewing: <span className="font-semibold text-foreground">{selectedCategory}</span>
            </p>
          )}
        </div>
      </div>

      {viewMode === "overview" ? (
      <div className="space-y-4">
        <Card className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-3xl font-bold text-primary">{categoryStats.length}</h3>
              <p className="text-xs font-semibold text-muted-foreground">Product Categories</p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log("Refreshing data...");
                fetchCategoryStats();
                fetchInferences();
              }}
            >
              Refresh Data
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/80 rounded-md p-2">
              <p className="text-xl font-bold text-accent">{inferences.length}</p>
              <p className="text-xs text-muted-foreground">Total PRPCs</p>
            </div>
            <div className="bg-background/80 rounded-md p-2">
              <p className="text-xl font-bold text-success">
                {categoryStats.reduce((sum, cat) => sum + cat.subscriptionCount, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Subscriptions</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryStats.length > 0 ? (
            categoryStats.map((stat, index) => (
              <Card
                key={stat.category}
                className={`p-6 bg-gradient-to-br ${getCategoryColor(index)} hover:shadow-lg transition-all cursor-pointer hover:scale-105`}
                onClick={() => handleCategoryClick(stat.category)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(stat.category)}
                    <div>
                      <h4 className="font-semibold text-lg">{stat.category}</h4>
                      <p className="text-xs text-muted-foreground">Product Category</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary">{stat.prpcCount}</p>
                    <p className="text-xs text-muted-foreground">Total PRPCs</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-accent">{stat.subscriptionCount}</p>
                    <p className="text-xs text-muted-foreground">Subscriptions</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-success/10 rounded-lg p-2 border border-success/20">
                    <p className="text-lg font-bold text-success">{stat.highConfidence || 0}</p>
                    <p className="text-xs text-muted-foreground">High Conf</p>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-2 border border-warning/20">
                    <p className="text-lg font-bold text-warning">{stat.mediumConfidence || 0}</p>
                    <p className="text-xs text-muted-foreground">Med Conf</p>
                  </div>
                  <div className="bg-destructive/10 rounded-lg p-2 border border-destructive/20">
                    <p className="text-lg font-bold text-destructive">{stat.lowConfidence || 0}</p>
                    <p className="text-xs text-muted-foreground">Low Conf</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Click to view details →
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <div className="col-span-3 text-center py-8 text-muted-foreground">
              No categories found. Click "Refresh Data" to load.
            </div>
          )}
        </div>
      </div>
    ) : (
        <>
          {/* Confidence Filter */}
          <div className="flex gap-2">
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-[250px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by confidence..." />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="low">Low Confidence (&lt; 40%)</SelectItem>
                <SelectItem value="medium">Medium Confidence (40% - 69%)</SelectItem>
                <SelectItem value="high">High Confidence (≥ 70%)</SelectItem>
                <SelectItem value="all">All Confidence Levels</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Rate Plan</TableHead>
                  <TableHead>Charge</TableHead>
                  <TableHead>POB</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInferences.map((inference) => (
                  <TableRow
                    key={inference.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedInference(inference)}
                  >
                    <TableCell className="font-medium">{inference.product_name}</TableCell>
                    <TableCell>{inference.rate_plan_name}</TableCell>
                    <TableCell>{inference.charge_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {inference.inferred_pob || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(inference.status)}>
                        {inference.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{getConfidenceBadge(inference.confidence)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInference(inference);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {filteredInferences.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No PRPC inferences found for selected filter
            </div>
          )}
        </>
      )}

      <PRPCEvidenceDrawer
        inference={selectedInference}
        open={!!selectedInference}
        onClose={() => setSelectedInference(null)}
        onUpdate={fetchInferences}
        userRole={userRole}
      />
    </div>
  );
};
