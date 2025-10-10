import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, ExternalLink, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PRPCInference {
  id: string;
  prpc_id: string;
  product_name: string;
  rate_plan_name: string;
  charge_name: string;
  inferred_product_category: string | null;
  inferred_pob: string | null;
  confidence: number | null;
  status: string;
  rationale: string | null;
  evidence_refs: any;
  explanation_vector: any;
  conflict_flags: string[];
  needs_review: boolean;
  last_reviewed_by: string | null;
  last_reviewed_at: string | null;
}

interface Props {
  inference: PRPCInference | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
}

export const PRPCEvidenceDrawer = ({ inference, open, onClose, onUpdate, userRole }: Props) => {
  const [editMode, setEditMode] = useState(false);
  const [category, setCategory] = useState("");
  const [pob, setPob] = useState("");
  const [reason, setReason] = useState("");

  if (!inference) return null;

  const handleReclassify = async () => {
    if (!category || !pob || !reason) {
      toast.error("Please fill in all fields");
      return;
    }

    const { error } = await supabase
      .from("prpc_inferences")
      .update({
        inferred_product_category: category,
        inferred_pob: pob,
        status: "user_adjusted",
        last_reviewed_at: new Date().toISOString()
      })
      .eq("id", inference.id);

    if (error) {
      toast.error("Failed to reclassify");
      return;
    }

    // Log audit
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_log").insert({
        actor: user.id,
        action: "reclassify",
        entity_type: "prpc",
        entity_id: inference.id,
        customer_id: inference.id,
        before_json: {
          category: inference.inferred_product_category,
          pob: inference.inferred_pob
        } as any,
        after_json: { category, pob } as any
      });
    }

    toast.success("PRPC reclassified");
    setEditMode(false);
    setReason("");
    onUpdate();
  };

  const handleApprove = async () => {
    if (userRole !== "admin") {
      toast.error("Only admins can approve");
      return;
    }

    const { error } = await supabase
      .from("prpc_inferences")
      .update({ status: "approved" })
      .eq("id", inference.id);

    if (error) {
      toast.error("Failed to approve");
      return;
    }

    toast.success("PRPC approved");
    onUpdate();
  };

  const getConfidenceColor = (conf: number | null) => {
    if (!conf) return "bg-muted";
    if (conf >= 0.8) return "bg-success/10 text-success";
    if (conf >= 0.5) return "bg-warning/10 text-warning";
    return "bg-destructive/10 text-destructive";
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>PRPC Evidence</SheetTitle>
          <div className="text-sm text-muted-foreground">
            {inference.product_name} / {inference.rate_plan_name} / {inference.charge_name}
          </div>
          <div className="flex gap-2 mt-2">
            <Badge className={getConfidenceColor(inference.confidence)}>
              Confidence: {((inference.confidence || 0) * 100).toFixed(0)}%
            </Badge>
            <Badge variant="outline">{inference.status}</Badge>
            {inference.conflict_flags?.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {inference.conflict_flags.length} conflicts
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="rationale" className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rationale">Why This?</TabsTrigger>
            <TabsTrigger value="sot">Source of Truth</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
            <TabsTrigger value="impact">Impact</TabsTrigger>
          </TabsList>

          <TabsContent value="rationale" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plain-English Rationale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{inference.rationale || "No rationale provided"}</p>
              </CardContent>
            </Card>

            {inference.explanation_vector && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Signals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-1">
                    {Object.entries(inference.explanation_vector).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!editMode ? (
              <div className="space-y-2">
                <Button onClick={() => setEditMode(true)} className="w-full">
                  Re-classify PRPC
                </Button>
                {userRole === "admin" && inference.status !== "approved" && (
                  <Button onClick={handleApprove} variant="outline" className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Licenses"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>POB</Label>
                    <Input
                      value={pob}
                      onChange={(e) => setPob(e.target.value)}
                      placeholder="e.g., Subscription"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (required)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why are you making this change?"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleReclassify} className="flex-1">
                      Save Changes
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline">
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="sot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Zuora Billing Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {inference.evidence_refs && Array.isArray(inference.evidence_refs) ? (
                  inference.evidence_refs.map((ref: any, idx: number) => (
                    <div key={idx} className="border-l-2 border-primary/20 pl-3 py-2">
                      <div className="text-sm font-medium">{ref.object_type || "PRPC"}</div>
                      <div className="text-xs text-muted-foreground space-y-1 mt-1">
                        {Object.entries(ref.fields || {}).map(([k, v]: [string, any]) => (
                          <div key={k}>
                            <span className="font-medium">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No source of truth data available
                  </p>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open in Zuora
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            {inference.conflict_flags && inference.conflict_flags.length > 0 ? (
              inference.conflict_flags.map((flag, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Conflict Detected</p>
                        <p className="text-sm text-muted-foreground">{flag}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">No conflicts detected</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="impact" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Change Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span>Impact analysis will show similar PRPCs affected by reclassification</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Preview Similar PRPCs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
