import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AICategoryAssistantProps {
  customerId: string;
  selectedCategory: string | null;
  onUpdate: () => void;
}

export const AICategoryAssistant = ({ customerId, selectedCategory, onUpdate }: AICategoryAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    if (!selectedCategory) {
      toast.error("Please select a category first");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-categorization-feedback', {
        body: {
          feedback: feedback.trim(),
          customerId,
          selectedCategory
        }
      });

      if (error) throw error;

      toast.success(
        `Updated ${data.updated_count} products to "${data.new_category}"`,
        {
          description: data.rationale
        }
      );

      setFeedback("");
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error processing feedback:', error);
      toast.error("Failed to process feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline"
          className="relative group hover:scale-105 transition-all duration-300 border-2 border-accent/30 hover:border-accent shadow-lg hover:shadow-accent/20 bg-gradient-to-r from-accent/5 to-primary/5"
        >
          <Bot className="h-4 w-4 mr-2 text-accent" />
          <span className="font-semibold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            Feedback
          </span>
          <Sparkles className="h-3 w-3 ml-1 text-accent animate-pulse" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            AI Categorization Assistant
          </DialogTitle>
          <DialogDescription>
            Describe what needs to be corrected, and I'll update the product categories accordingly.
            {selectedCategory && (
              <span className="block mt-2 text-sm font-medium">
                Currently viewing: <span className="text-foreground">{selectedCategory}</span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <p className="font-semibold mb-2">Example feedback:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• "Hardware products should be categorized as Hardware One Time"</li>
              <li>• "Server charges are not SaaS, they are Hardware"</li>
              <li>• "Support services should be in the Support category"</li>
              <li>• "Training items need to be moved to Training category"</li>
            </ul>
          </div>

          <Textarea
            placeholder="Type your feedback here... (e.g., 'hardware is not in the correct product category, it should be hardware one time')"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="min-h-[120px]"
            disabled={loading}
          />

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false);
                setFeedback("");
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !feedback.trim() || !selectedCategory}
              className="bg-gradient-to-r from-accent to-primary hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
