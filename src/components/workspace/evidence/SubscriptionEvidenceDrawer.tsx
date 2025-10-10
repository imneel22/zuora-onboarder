import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Subscription {
  id: string;
  subscription_id: string;
  customer_id: string;
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

interface Props {
  subscription: Subscription | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  userRole: string;
}

export const SubscriptionEvidenceDrawer = ({ subscription, open, onClose, onUpdate, userRole }: Props) => {
  const [proposalMode, setProposalMode] = useState(false);
  const [editedAttributes, setEditedAttributes] = useState<any>({});
  const [reason, setReason] = useState("");

  if (!subscription) return null;

  const handleToggleAudited = async () => {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        audited: !subscription.audited,
        audited_at: new Date().toISOString(),
        audited_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq("id", subscription.id);

    if (error) {
      toast.error("Failed to update audit status");
      return;
    }

    toast.success(`Subscription ${subscription.audited ? "un-audited" : "audited"}`);
    onUpdate();
  };

  const handleProposeCorrection = async () => {
    if (!reason) {
      toast.error("Please provide a reason for the correction");
      return;
    }

    const { error } = await supabase
      .from("subscriptions")
      .update(editedAttributes)
      .eq("id", subscription.id);

    if (error) {
      toast.error("Failed to propose correction");
      return;
    }

    // Log audit
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("audit_log").insert({
        actor: user.id,
        action: "propose_correction",
        entity_type: "subscription",
        entity_id: subscription.id,
        customer_id: subscription.customer_id,
        before_json: subscription as any,
        after_json: editedAttributes as any
      });
    }

    toast.success("Correction proposed");
    setProposalMode(false);
    setReason("");
    setEditedAttributes({});
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
          <SheetTitle>Subscription Evidence</SheetTitle>
          <div className="text-sm text-muted-foreground">
            ID: {subscription.subscription_id}
          </div>
          <div className="flex gap-2 mt-2">
            <Badge className={getConfidenceColor(subscription.confidence)}>
              Confidence: {((subscription.confidence || 0) * 100).toFixed(0)}%
            </Badge>
            <Badge variant={subscription.audited ? "default" : "outline"}>
              {subscription.audited ? "Audited" : "Not Audited"}
            </Badge>
            {subscription.conflict_flags?.length > 0 && (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {subscription.conflict_flags.length} conflicts
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Tabs defaultValue="derivation" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="derivation">Derivation</TabsTrigger>
            <TabsTrigger value="sot">Source of Truth</TabsTrigger>
            <TabsTrigger value="conflicts">Conflicts</TabsTrigger>
          </TabsList>

          <TabsContent value="derivation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Derivation Trace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscription.derivation_trace ? (
                  Object.entries(subscription.derivation_trace).map(([attr, trace]: [string, any]) => (
                    <div key={attr} className="border-l-2 border-primary/20 pl-3 py-2">
                      <div className="text-sm font-medium capitalize">{attr}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {trace.rule || "No rule defined"}
                      </div>
                      {trace.fields && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Fields used: {trace.fields.join(", ")}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No derivation trace available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Current Attributes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox checked={subscription.termed} disabled />
                    <span>Termed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={subscription.evergreen} disabled />
                    <span>Evergreen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={subscription.has_cancellation} disabled />
                    <span>Has Cancellation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={subscription.has_ramps} disabled />
                    <span>Has Ramps</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={subscription.has_discounts} disabled />
                    <span>Has Discounts</span>
                  </div>
                </div>
                <div className="pt-2 space-y-1">
                  <div><span className="font-medium">Billing Period:</span> {subscription.billing_period}</div>
                  <div><span className="font-medium">Currency:</span> {subscription.currency}</div>
                  <div><span className="font-medium">Status:</span> {subscription.status}</div>
                </div>
              </CardContent>
            </Card>

            {!proposalMode ? (
              <div className="space-y-2">
                <Button onClick={() => setProposalMode(true)} className="w-full">
                  Propose Correction
                </Button>
                <Button
                  onClick={handleToggleAudited}
                  variant="outline"
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {subscription.audited ? "Mark Not Audited" : "Mark Audited"}
                </Button>
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Attribute Corrections</Label>
                    <div className="text-xs text-muted-foreground">
                      Check attributes to modify (simplified for demo)
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Reason (required)</Label>
                    <Textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why are you making this correction?"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleProposeCorrection} className="flex-1">
                      Submit Correction
                    </Button>
                    <Button onClick={() => setProposalMode(false)} variant="outline">
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
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Snapshot Hash:</span>{" "}
                    <span className="text-muted-foreground font-mono text-xs">
                      {subscription.sot_snapshot_hash || "Not captured"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Key fields from Subscription, RatePlan, and RatePlanCharge objects
                  </p>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open in Zuora
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conflicts" className="space-y-4">
            {subscription.conflict_flags && subscription.conflict_flags.length > 0 ? (
              subscription.conflict_flags.map((flag, idx) => (
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
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
