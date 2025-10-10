import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export const WhatTheySell = ({ customerId }: { customerId: string }) => {
  const [inferences, setInferences] = useState<PRPCInference[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInference, setSelectedInference] = useState<PRPCInference | null>(null);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [userRole, setUserRole] = useState<string>("standard");

  useEffect(() => {
    fetchUserRole();
    fetchInferences();
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

  let filteredInferences = inferences.filter((inf) =>
    inf.product_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.rate_plan_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.charge_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_product_category?.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_pob?.toLowerCase().includes(search.toLowerCase())
  );

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          PRPC-level product categorization and POB mapping with AI rationale
        </p>
      </div>

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
              <TableHead>Confidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Conflicts</TableHead>
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
                <TableCell>{inference.inferred_product_category || "—"}</TableCell>
                <TableCell>{inference.inferred_pob || "—"}</TableCell>
                <TableCell>{getConfidenceBadge(inference.confidence)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(inference.status)}>
                    {inference.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  {inference.conflict_flags?.length > 0 ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {inference.conflict_flags.length}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                  )}
                </TableCell>
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
