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
import { Search, CheckCircle, AlertTriangle, Filter, LayoutGrid, List, Package, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PRPCEvidenceDrawer } from "./evidence/PRPCEvidenceDrawer";
import { Progress } from "@/components/ui/progress";

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
}

export const WhatTheySell = ({ customerId }: { customerId: string }) => {
  const [inferences, setInferences] = useState<PRPCInference[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInference, setSelectedInference] = useState<PRPCInference | null>(null);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("standard");
  const [viewMode, setViewMode] = useState<"overview" | "details">("overview");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchUserRole();
    fetchInferences();
    fetchCategoryStats();
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

  const fetchInferences = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prpc_inferences")
      .select("*")
      .eq("customer_id", customerId)
      .order("product_name");

    if (error) {
      toast.error("Failed to load inferences");
      console.error(error);
    } else {
      setInferences(data || []);
    }
    setLoading(false);
  };

  const fetchCategoryStats = async () => {
    const { data: prpcData, error: prpcError } = await supabase
      .from("prpc_inferences")
      .select("*")
      .eq("customer_id", customerId);

    if (prpcError) {
      console.error(prpcError);
      return;
    }

    const { data: subData, error: subError } = await supabase
      .from("subscription_coverage_candidates")
      .select("subscription_id, covers_product_categories")
      .eq("customer_id", customerId);

    if (subError) {
      console.error(subError);
      return;
    }

    const categoryMap = new Map<string, CategoryStats & { needsReview: number; lowConfidence: number }>();

    prpcData?.forEach((prpc) => {
      const category = prpc.inferred_product_category || "Uncategorized";
      if (!categoryMap.has(category)) {
        categoryMap.set(category, {
          category,
          prpcCount: 0,
          subscriptionCount: 0,
          avgConfidence: 0,
          approvalRate: 0,
          needsReview: 0,
          lowConfidence: 0,
        });
      }
      const stats = categoryMap.get(category)!;
      stats.prpcCount++;
      stats.avgConfidence += prpc.confidence || 0;
      if (prpc.status === "approved") stats.approvalRate++;
      if (prpc.needs_review) stats.needsReview++;
      if ((prpc.confidence || 0) < 0.5) stats.lowConfidence++;
    });

    subData?.forEach((sub) => {
      sub.covers_product_categories?.forEach((cat: string) => {
        if (categoryMap.has(cat)) {
          categoryMap.get(cat)!.subscriptionCount++;
        }
      });
    });

    categoryMap.forEach((stats) => {
      stats.avgConfidence = stats.prpcCount > 0 ? stats.avgConfidence / stats.prpcCount : 0;
      stats.approvalRate = stats.prpcCount > 0 ? (stats.approvalRate / stats.prpcCount) * 100 : 0;
    });

    setCategoryStats(Array.from(categoryMap.values()).sort((a, b) => b.prpcCount - a.prpcCount));
  };

  let filteredInferences = inferences.filter((inf) =>
    inf.product_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.rate_plan_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.charge_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_product_category?.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_pob?.toLowerCase().includes(search.toLowerCase())
  );

  // Apply category filter if selected
  if (selectedCategory) {
    filteredInferences = filteredInferences.filter(
      (inf) => inf.inferred_product_category === selectedCategory
    );
  }

  // Apply additional filters
  if (filterBy === "low_confidence") {
    filteredInferences = filteredInferences.filter(inf => (inf.confidence || 0) < 0.5);
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
    setFilterBy("all");
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
    return <Package className="h-6 w-6" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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
      </div>

      {viewMode === "overview" ? (
        <div className="space-y-4">
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-accent/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold">{categoryStats.length}</h3>
                <p className="text-sm text-muted-foreground">Product Categories</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-2xl font-bold text-accent">{inferences.length}</p>
                <p className="text-xs text-muted-foreground">Total PRPCs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {categoryStats.reduce((sum, cat) => sum + cat.subscriptionCount, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Subscriptions</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">
                  {categoryStats.length > 0
                    ? Math.round(
                        categoryStats.reduce((sum, cat) => sum + cat.avgConfidence, 0) /
                          categoryStats.length *
                          100
                      )
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Confidence</p>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryStats.map((stat, index) => (
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
                  <Badge variant="outline" className="text-xs">
                    {Math.round(stat.approvalRate)}% Approved
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-primary">{stat.prpcCount}</p>
                    <p className="text-xs text-muted-foreground">PRPCs</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-2xl font-bold text-accent">{stat.subscriptionCount}</p>
                    <p className="text-xs text-muted-foreground">Subscriptions</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-warning">{(stat as any).needsReview}</p>
                    <p className="text-xs text-muted-foreground">Needs Review</p>
                  </div>
                  <div className="bg-background/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-destructive">{(stat as any).lowConfidence}</p>
                    <p className="text-xs text-muted-foreground">Low Confidence</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg Confidence</span>
                    <span className="font-semibold">{Math.round(stat.avgConfidence * 100)}%</span>
                  </div>
                  <Progress value={stat.avgConfidence * 100} className="h-2" />
                </div>

                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground text-center">
                    Click to view details →
                  </p>
                </div>
              </Card>
            ))}
          </div>

          {categoryStats.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No product categories found
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products, rate plans, categories..."
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
                <SelectItem value="conflicts">Has Conflicts</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="not_approved">Not Approved</SelectItem>
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
                  <TableHead>Category</TableHead>
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
                        {inference.inferred_product_category || "N/A"}
                      </Badge>
                    </TableCell>
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
              No PRPC inferences found
            </div>
          )}
        </>
      )}

      <PRPCEvidenceDrawer
        inference={selectedInference}
        open={!!selectedInference}
        onClose={() => setSelectedInference(null)}
        onUpdate={() => {
          fetchInferences();
          fetchCategoryStats();
        }}
        userRole={userRole}
      />
    </div>
  );
};
