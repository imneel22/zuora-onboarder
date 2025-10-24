import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, CheckCircle, AlertTriangle, Filter, LayoutGrid, List, Package, TrendingUp, Cloud, Cpu, Code, Sparkles, Layers, Gift, Users, Briefcase, HeadphonesIcon, GraduationCap, Info, ArrowRightLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PRPCEvidenceDrawer } from "./evidence/PRPCEvidenceDrawer";
import { AICategoryAssistant } from "./AICategoryAssistant";
import { CustomFieldConfig } from "./CustomFieldConfig";
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
export const WhatTheySell = ({
  customerId
}: {
  customerId: string;
}) => {
  const [inferences, setInferences] = useState<PRPCInference[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInference, setSelectedInference] = useState<PRPCInference | null>(null);
  const [filterBy, setFilterBy] = useState<string>("low");
  const [userRole, setUserRole] = useState<string>("standard");
  const [viewMode, setViewMode] = useState<"overview" | "details">("overview");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedInferenceIds, setSelectedInferenceIds] = useState<Set<string>>(new Set());
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>("");
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [categoryToRename, setCategoryToRename] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>("");
  const [isCreatingNewCategory, setIsCreatingNewCategory] = useState(false);
  const [newBulkCategoryName, setNewBulkCategoryName] = useState<string>("");
  useEffect(() => {
    console.log("Component mounted, customer ID:", customerId);
    fetchUserRole();
    fetchInferences();
    fetchCategoryStats();
    fetchAvailableCategories();
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
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (user) {
      const {
        data
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id).single();
      if (data) setUserRole(data.role);
    }
  };
  const fetchInferences = async () => {
    setLoading(true);
    let query = supabase.from("prpc_inferences").select("*").eq("customer_id", customerId);

    // If viewing a specific category, filter in the query
    if (selectedCategory) {
      query = query.eq("inferred_product_category", selectedCategory);
    }
    const {
      data,
      error
    } = await query.order("confidence", {
      ascending: true
    }) // Order by confidence to show low confidence first
    .order("product_name").limit(10000);
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
    const {
      data,
      error
    } = await supabase.rpc('get_category_stats', {
      p_customer_id: customerId
    });
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
      highConfidence: parseInt(row.high_confidence_count)
    })) || [];
    console.log("Processed stats:", stats);
    console.log("Categories found:", stats.map((s: any) => s.category));
    setCategoryStats(stats);
  };

  const fetchAvailableCategories = async () => {
    const { data, error } = await supabase
      .from("product_category_catalog")
      .select("category_name")
      .eq("active", true)
      .order("category_name");
    
    if (error) {
      console.error("Failed to fetch categories:", error);
      return;
    }
    
    const uniqueCategories = [...new Set(data?.map(c => c.category_name) || [])];
    setAvailableCategories(uniqueCategories);
  };

  const handleCategoryOverride = async (inferenceId: string, newCategory: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to update categories");
      return;
    }

    // Find the current inference
    const currentInference = inferences.find(inf => inf.id === inferenceId);
    if (!currentInference) return;

    const oldCategory = currentInference.inferred_product_category;

    // Update the inference
    const { error: updateError } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: newCategory,
        status: "user_adjusted",
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString()
      })
      .eq("id", inferenceId);

    if (updateError) {
      toast.error("Failed to update category");
      console.error(updateError);
      return;
    }

    // Log the change in audit trail
    const { error: auditError } = await supabase
      .from("audit_log")
      .insert({
        customer_id: customerId,
        entity_type: "prpc_inference",
        entity_id: inferenceId,
        action: "category_override",
        before_json: { inferred_product_category: oldCategory },
        after_json: { inferred_product_category: newCategory },
        actor: user.id
      });

    if (auditError) {
      console.error("Failed to log audit entry:", auditError);
    }

    toast.success(`Category updated to ${newCategory}`);
    
    // Refresh data
    fetchInferences();
    fetchCategoryStats();
  };

  const handleBulkCategoryChange = async () => {
    if (selectedInferenceIds.size === 0) {
      toast.error("Please select PRPCs to update");
      return;
    }

    const targetCategory = isCreatingNewCategory ? newBulkCategoryName.trim() : bulkTargetCategory;

    if (!targetCategory) {
      toast.error(isCreatingNewCategory ? "Please enter a category name" : "Please select a target category");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in to update categories");
      return;
    }

    const idsArray = Array.from(selectedInferenceIds);

    // If creating new category, add it to catalog first
    if (isCreatingNewCategory) {
      const { error: catalogError } = await supabase
        .from("product_category_catalog")
        .insert({
          category_name: targetCategory,
          pob_name: "General", // Default POB for new categories
          customer_id: customerId,
          active: true
        });

      if (catalogError && !catalogError.message.includes('duplicate')) {
        toast.error("Failed to create new category");
        console.error(catalogError);
        return;
      }
    }

    // Update all selected inferences
    const { error: updateError } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: targetCategory,
        status: "user_adjusted",
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString()
      })
      .in("id", idsArray);

    if (updateError) {
      toast.error("Failed to update categories");
      console.error(updateError);
      return;
    }

    // Log audit entries
    for (const id of idsArray) {
      const currentInference = inferences.find(inf => inf.id === id);
      await supabase
        .from("audit_log")
        .insert({
          customer_id: customerId,
          entity_type: "prpc_inference",
          entity_id: id,
          action: isCreatingNewCategory ? "create_and_assign_category" : "bulk_category_override",
          before_json: { inferred_product_category: currentInference?.inferred_product_category },
          after_json: { inferred_product_category: targetCategory },
          actor: user.id
        });
    }

    toast.success(`Updated ${idsArray.length} PRPCs to ${targetCategory}${isCreatingNewCategory ? ' (new category)' : ''}`);
    
    // Clear selection and refresh
    setSelectedInferenceIds(new Set());
    setBulkTargetCategory("");
    setIsCreatingNewCategory(false);
    setNewBulkCategoryName("");
    fetchInferences();
    fetchCategoryStats();
    fetchAvailableCategories();
  };

  const handleMergeCategory = async (fromCategory: string, toCategory: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    // Get all PRPCs in the source category
    const { data: prpcsToUpdate, error: fetchError } = await supabase
      .from("prpc_inferences")
      .select("id")
      .eq("customer_id", customerId)
      .eq("inferred_product_category", fromCategory);

    if (fetchError || !prpcsToUpdate) {
      toast.error("Failed to fetch PRPCs");
      return;
    }

    // Update all PRPCs from old category to new category
    const { error: updateError } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: toCategory,
        status: "user_adjusted",
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString()
      })
      .eq("customer_id", customerId)
      .eq("inferred_product_category", fromCategory);

    if (updateError) {
      toast.error("Failed to merge categories");
      console.error(updateError);
      return;
    }

    // Log audit entry
    await supabase
      .from("audit_log")
      .insert({
        customer_id: customerId,
        entity_type: "category_merge",
        entity_id: customerId,
        action: "merge_category",
        before_json: { from_category: fromCategory, prpc_count: prpcsToUpdate.length },
        after_json: { to_category: toCategory },
        actor: user.id
      });

    toast.success(`Merged ${prpcsToUpdate.length} PRPCs from "${fromCategory}" to "${toCategory}"`);
    
    // Refresh data and go back to overview
    handleBackToOverview();
    fetchInferences();
    fetchCategoryStats();
  };

  const handleRenameCategory = async () => {
    if (!categoryToRename || !newCategoryName.trim()) {
      toast.error("Please enter a valid category name");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    // Get all PRPCs in the category to rename
    const { data: prpcsToUpdate, error: fetchError } = await supabase
      .from("prpc_inferences")
      .select("id")
      .eq("customer_id", customerId)
      .eq("inferred_product_category", categoryToRename);

    if (fetchError) {
      toast.error("Failed to fetch PRPCs");
      return;
    }

    // Update all PRPCs with the new category name
    const { error: updateError } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: newCategoryName,
        status: "user_adjusted",
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString()
      })
      .eq("customer_id", customerId)
      .eq("inferred_product_category", categoryToRename);

    if (updateError) {
      toast.error("Failed to rename category");
      console.error(updateError);
      return;
    }

    // Update the category catalog
    const { error: catalogError } = await supabase
      .from("product_category_catalog")
      .update({ category_name: newCategoryName })
      .eq("category_name", categoryToRename)
      .eq("customer_id", customerId);

    if (catalogError) {
      console.error("Failed to update catalog:", catalogError);
    }

    // Log audit entry
    await supabase
      .from("audit_log")
      .insert({
        customer_id: customerId,
        entity_type: "category_rename",
        entity_id: customerId,
        action: "rename_category",
        before_json: { old_name: categoryToRename, prpc_count: prpcsToUpdate?.length || 0 },
        after_json: { new_name: newCategoryName },
        actor: user.id
      });

    toast.success(`Renamed "${categoryToRename}" to "${newCategoryName}" (${prpcsToUpdate?.length || 0} PRPCs updated)`);
    
    // Reset dialog state
    setIsRenameDialogOpen(false);
    setCategoryToRename("");
    setNewCategoryName("");
    
    // Refresh data
    if (selectedCategory === categoryToRename) {
      setSelectedCategory(newCategoryName);
    }
    fetchInferences();
    fetchCategoryStats();
    fetchAvailableCategories();
  };

  const handleInlineRename = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      setEditingCategory(null);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("You must be logged in");
      setEditingCategory(null);
      return;
    }

    // Get all PRPCs in the category to rename
    const { data: prpcsToUpdate, error: fetchError } = await supabase
      .from("prpc_inferences")
      .select("id")
      .eq("customer_id", customerId)
      .eq("inferred_product_category", oldName);

    if (fetchError) {
      toast.error("Failed to fetch PRPCs");
      setEditingCategory(null);
      return;
    }

    // Update all PRPCs with the new category name
    const { error: updateError } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: newName,
        status: "user_adjusted",
        last_reviewed_by: user.id,
        last_reviewed_at: new Date().toISOString()
      })
      .eq("customer_id", customerId)
      .eq("inferred_product_category", oldName);

    if (updateError) {
      toast.error("Failed to rename category");
      console.error(updateError);
      setEditingCategory(null);
      return;
    }

    // Update the category catalog
    const { error: catalogError } = await supabase
      .from("product_category_catalog")
      .update({ category_name: newName })
      .eq("category_name", oldName)
      .eq("customer_id", customerId);

    if (catalogError) {
      console.error("Failed to update catalog:", catalogError);
    }

    // Log audit entry
    await supabase
      .from("audit_log")
      .insert({
        customer_id: customerId,
        entity_type: "category_rename",
        entity_id: customerId,
        action: "rename_category",
        before_json: { old_name: oldName, prpc_count: prpcsToUpdate?.length || 0 },
        after_json: { new_name: newName },
        actor: user.id
      });

    toast.success(`Renamed "${oldName}" to "${newName}" (${prpcsToUpdate?.length || 0} PRPCs updated)`);
    
    // Reset editing state
    setEditingCategory(null);
    setEditingCategoryName("");
    
    // Refresh data
    if (selectedCategory === oldName) {
      setSelectedCategory(newName);
    }
    fetchInferences();
    fetchCategoryStats();
    fetchAvailableCategories();
  };

  const toggleSelectAll = () => {
    if (selectedInferenceIds.size === filteredInferences.length) {
      setSelectedInferenceIds(new Set());
    } else {
      setSelectedInferenceIds(new Set(filteredInferences.map(inf => inf.id)));
    }
  };

  const toggleSelectInference = (id: string) => {
    const newSet = new Set(selectedInferenceIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedInferenceIds(newSet);
  };
  let filteredInferences = inferences.filter(inf => inf.product_name.toLowerCase().includes(search.toLowerCase()) || inf.rate_plan_name.toLowerCase().includes(search.toLowerCase()) || inf.charge_name.toLowerCase().includes(search.toLowerCase()) || inf.inferred_product_category?.toLowerCase().includes(search.toLowerCase()) || inf.inferred_pob?.toLowerCase().includes(search.toLowerCase()));
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
      low: "bg-destructive/10 text-destructive border-destructive/20"
    };
    return <Badge variant="outline" className={colors[level]}>
        {Math.round(confidence * 100)}%
      </Badge>;
  };
  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }
  const getCategoryColor = (index: number) => {
    const colors = ["from-primary/20 to-primary/5", "from-accent/20 to-accent/5", "from-success/20 to-success/5", "from-warning/20 to-warning/5"];
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
  return <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {selectedCategory && <Button variant="outline" size="sm" onClick={handleBackToOverview}>
              Back to Overview
            </Button>}
          <Button variant={viewMode === "overview" ? "default" : "outline"} size="sm" onClick={() => setViewMode("overview")} disabled={!!selectedCategory}>
            <LayoutGrid className="h-4 w-4 mr-2" />
            Overview
          </Button>
        </div>
        <div className="flex items-center gap-3">
          {selectedCategory && <p className="text-xs text-muted-foreground">
              Viewing: <span className="font-semibold text-foreground">{selectedCategory}</span>
            </p>}
          <AICategoryAssistant 
            customerId={customerId} 
            selectedCategory={selectedCategory}
            onUpdate={fetchInferences}
            viewMode={viewMode}
            currentFilter={filterBy}
          />
          {viewMode === "overview" && <CustomFieldConfig customerId={customerId} />}
        </div>
      </div>

      {viewMode === "overview" ? <div className="space-y-4">
        <Card className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-3xl font-bold text-primary">{categoryStats.length}</h3>
              <p className="text-xs font-semibold text-muted-foreground">Product Categories</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => {
            console.log("Refreshing data...");
            fetchCategoryStats();
            fetchInferences();
          }}>
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
          {categoryStats.length > 0 ? categoryStats.map((stat, index) => <Card key={stat.category} className={`p-6 bg-gradient-to-br ${getCategoryColor(index)} hover:shadow-lg transition-all cursor-pointer hover:scale-105 group`} onClick={() => handleCategoryClick(stat.category)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(stat.category)}
                    <div>
                      {editingCategory === stat.category ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleInlineRename(stat.category, editingCategoryName);
                              } else if (e.key === 'Escape') {
                                setEditingCategory(null);
                                setEditingCategoryName("");
                              }
                            }}
                            className="h-8 w-40 text-sm font-semibold"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => handleInlineRename(stat.category, editingCategoryName)}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setEditingCategory(null);
                              setEditingCategoryName("");
                            }}
                          >
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{stat.category}</h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(stat.category);
                                setEditingCategoryName(stat.category);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Product Category</p>
                        </>
                      )}
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
              </Card>) : <div className="col-span-3 text-center py-8 text-muted-foreground">
              No categories found. Click "Refresh Data" to load.
            </div>}
        </div>
      </div> : <>
          {/* Filters and Bulk Actions */}
          <div className="flex gap-2 items-center justify-between">
            <div className="flex gap-2 items-center">
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

              {selectedCategory && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                      Merge Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background">
                    <DialogHeader>
                      <DialogTitle>Merge Category: {selectedCategory}</DialogTitle>
                      <DialogDescription>
                        Move all PRPCs from "{selectedCategory}" to another category
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Target Category</label>
                        <Select onValueChange={setBulkTargetCategory}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select target category" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {availableCategories
                              .filter(cat => cat !== selectedCategory)
                              .map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={() => {
                          if (bulkTargetCategory && selectedCategory) {
                            handleMergeCategory(selectedCategory, bulkTargetCategory);
                          }
                        }}
                        disabled={!bulkTargetCategory}
                      >
                        Merge All PRPCs
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {selectedInferenceIds.size > 0 && (
              <Card className="px-4 py-2 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedInferenceIds.size} selected
                  </span>
                  
                  {!isCreatingNewCategory ? (
                    <>
                      <Select value={bulkTargetCategory} onValueChange={setBulkTargetCategory}>
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Move to category..." />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingNewCategory(true);
                          setBulkTargetCategory("");
                        }}
                      >
                        + New Category
                      </Button>
                    </>
                  ) : (
                    <>
                      <Input
                        value={newBulkCategoryName}
                        onChange={(e) => setNewBulkCategoryName(e.target.value)}
                        placeholder="Enter new category name..."
                        className="w-[200px] h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newBulkCategoryName.trim()) {
                            handleBulkCategoryChange();
                          } else if (e.key === 'Escape') {
                            setIsCreatingNewCategory(false);
                            setNewBulkCategoryName("");
                          }
                        }}
                        autoFocus
                      />
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsCreatingNewCategory(false);
                          setNewBulkCategoryName("");
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    size="sm" 
                    onClick={handleBulkCategoryChange}
                    disabled={isCreatingNewCategory ? !newBulkCategoryName.trim() : !bulkTargetCategory}
                  >
                    Apply
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => {
                      setSelectedInferenceIds(new Set());
                      setIsCreatingNewCategory(false);
                      setNewBulkCategoryName("");
                      setBulkTargetCategory("");
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={selectedInferenceIds.size === filteredInferences.length && filteredInferences.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Product Rate Plan Charge</TableHead>
                  <TableHead>Product Category</TableHead>
                  <TableHead>Revenue Recognition Timing</TableHead>
                  <TableHead>Amortization Technique</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Rationale</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInferences.map(inference => <TableRow key={inference.id} className="hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedInferenceIds.has(inference.id)}
                        onCheckedChange={() => toggleSelectInference(inference.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium cursor-pointer" onClick={() => setSelectedInference(inference)}>
                      {inference.product_name}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={inference.inferred_product_category || ""}
                        onValueChange={(value) => handleCategoryOverride(inference.id, value)}
                      >
                        <SelectTrigger className="w-[180px] h-8">
                          <SelectValue placeholder="Select category">
                            {inference.inferred_product_category || "N/A"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50">
                          {availableCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(inference as any).revenue_recognition_timing || "upon billing"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(inference as any).amortization_technique || "ratable over time"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getConfidenceBadge(inference.confidence)}</TableCell>
                    <TableCell 
                      className="max-w-xs text-sm cursor-pointer hover:bg-muted/50 transition-colors group"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedInference(inference);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div className="line-clamp-1 flex-1 group-hover:text-foreground transition-colors">
                          {inference.rationale && !inference.rationale.includes("test data") 
                            ? inference.rationale 
                            : "Recurring billing suggests SaaS despite hardware naming"}
                        </div>
                        <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={e => {
                  e.stopPropagation();
                  setSelectedInference(inference);
                }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </Card>

          {filteredInferences.length === 0 && <div className="py-12 text-center text-muted-foreground">
              No PRPC inferences found for selected filter
            </div>}
        </>}

      <PRPCEvidenceDrawer inference={selectedInference} open={!!selectedInference} onClose={() => setSelectedInference(null)} onUpdate={fetchInferences} userRole={userRole} />

      {/* Rename Category Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="bg-background">
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>
              Rename a category and update all associated PRPCs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category to Rename</label>
              <Select value={categoryToRename} onValueChange={setCategoryToRename}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New Category Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Enter new category name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameCategory} disabled={!categoryToRename || !newCategoryName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};