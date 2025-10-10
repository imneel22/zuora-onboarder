import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, Edit, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

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
}

export const WhatTheySell = ({ customerId }: { customerId: string }) => {
  const [inferences, setInferences] = useState<PRPCInference[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInference, setSelectedInference] = useState<PRPCInference | null>(null);
  const { userRole } = useAuth();

  useEffect(() => {
    fetchInferences();
  }, [customerId]);

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

  const filteredInferences = inferences.filter((inf) =>
    inf.product_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.rate_plan_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.charge_name.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_product_category?.toLowerCase().includes(search.toLowerCase()) ||
    inf.inferred_pob?.toLowerCase().includes(search.toLowerCase())
  );

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
        {userRole === "admin" && (
          <Button size="sm">
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve Selected
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products, rate plans, categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInferences.map((inference) => (
              <TableRow key={inference.id}>
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
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInference(inference)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
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

      <Dialog open={!!selectedInference} onOpenChange={() => setSelectedInference(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inference Details</DialogTitle>
            <DialogDescription>
              AI rationale and classification details
            </DialogDescription>
          </DialogHeader>
          {selectedInference && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Product</p>
                  <p className="text-sm text-muted-foreground">{selectedInference.product_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">PRPC ID</p>
                  <p className="text-sm text-muted-foreground">{selectedInference.prpc_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInference.inferred_product_category || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">POB</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedInference.inferred_pob || "—"}
                  </p>
                </div>
                {selectedInference.source_agent && (
                  <div>
                    <p className="text-sm font-medium">Source Agent</p>
                    <p className="text-sm text-muted-foreground">{selectedInference.source_agent}</p>
                  </div>
                )}
              </div>
              
              {selectedInference.rationale && (
                <div>
                  <p className="mb-2 text-sm font-medium">AI Rationale</p>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedInference.rationale}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
