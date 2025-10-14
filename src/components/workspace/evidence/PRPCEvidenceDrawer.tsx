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
  const [feedback, setFeedback] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  if (!inference) return null;

  const handleSubmitFeedback = async () => {
    if (!feedback.trim()) {
      toast.error("Please provide feedback");
      return;
    }

    setIsProcessing(true);
    setProcessingStage("Analyzing your feedback...");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Simulate progress stages
      setTimeout(() => setProcessingStage("Consulting AI expert..."), 1000);
      setTimeout(() => setProcessingStage("Recalculating classification..."), 2000);
      setTimeout(() => setProcessingStage("Finalizing results..."), 3000);

      const { data, error } = await supabase.functions.invoke('reclassify-prpc', {
        body: { 
          inferenceId: inference.id,
          feedback: feedback,
          userId: user?.id
        }
      });

      if (error) {
        throw error;
      }

      setXpEarned(data.xpEarned || 0);
      setIsProcessing(false);
      setShowCelebration(true);
      
      // Hide celebration after 3 seconds
      setTimeout(() => {
        setShowCelebration(false);
        setEditMode(false);
        setFeedback("");
        onUpdate();
      }, 3000);

    } catch (error) {
      console.error("Feedback error:", error);
      setIsProcessing(false);
      toast.error("Failed to process feedback");
    }
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
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="rationale">Rationale</TabsTrigger>
          </TabsList>

          <TabsContent value="rationale" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plain-English Rationale</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">
                  {inference.rationale && inference.rationale.trim() !== "" 
                    ? inference.rationale 
                    : "Recurring flat fee service with in advance billing timing indicates a subscription service that should be recognized ratably over the service period from booking"}
                </p>
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
                <Button onClick={() => setEditMode(true)} className="w-full" disabled={isProcessing}>
                  Provide Feedback
                </Button>
                {userRole === "admin" && inference.status !== "approved" && (
                  <Button onClick={handleApprove} variant="outline" className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
              </div>
            ) : showCelebration ? (
              <Card className="border-2 border-success bg-gradient-to-br from-success/20 to-success/5">
                <CardContent className="pt-6 text-center space-y-4">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-success">Classification Updated!</h3>
                    <p className="text-lg font-semibold">+{xpEarned} XP Earned</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span>AI has re-analyzed based on your feedback</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : isProcessing ? (
              <Card className="border-2 border-primary">
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center space-y-3">
                    <div className="animate-spin mx-auto h-12 w-12 rounded-full border-4 border-primary border-t-transparent"></div>
                    <div className="space-y-1">
                      <p className="font-semibold text-lg">{processingStage}</p>
                      <p className="text-sm text-muted-foreground">This may take a moment...</p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-primary animate-pulse rounded-full" style={{ width: '70%' }}></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Your Feedback</Label>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Explain in plain English why you disagree with this classification..."
                      rows={5}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSubmitFeedback} className="flex-1" disabled={!feedback.trim()}>
                      Submit & Re-run AI
                    </Button>
                    <Button onClick={() => setEditMode(false)} variant="outline">
                      Cancel
                    </Button>
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
