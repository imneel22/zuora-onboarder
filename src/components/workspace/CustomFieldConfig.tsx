import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

interface FieldConfig {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  include_in_llm: boolean;
  description: string | null;
  table_name?: string;
  distinct_values?: string[];
  sample_count?: number;
}

export const CustomFieldConfig = ({ customerId }: { customerId: string }) => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [customerId]);

  const fetchFields = async () => {
    setLoading(true);
    
    // First, get existing field configurations
    const { data: existingConfigs } = await supabase
      .from("customer_field_config")
      .select("*")
      .eq("customer_id", customerId);

    const configMap = new Map(existingConfigs?.map(c => [c.field_name, c]) || []);

    // Discover fields from prpc_inferences table
    const { data: prpcData } = await supabase
      .from("prpc_inferences")
      .select("*")
      .eq("customer_id", customerId)
      .limit(100);

    // Discover fields from subscriptions table  
    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("customer_id", customerId)
      .limit(100);

    const discoveredFields: FieldConfig[] = [];

    // Analyze PRPC fields
    if (prpcData && prpcData.length > 0) {
      const sampleRow = prpcData[0];
      const customFieldKeys = Object.keys(sampleRow).filter(
        key => !['id', 'customer_id', 'prpc_id', 'product_name', 'rate_plan_name', 
                 'charge_name', 'inferred_product_category', 'inferred_pob', 
                 'confidence', 'status', 'rationale', 'created_at', 'updated_at',
                 'source_agent', 'evidence_refs', 'explanation_vector', 'conflict_flags',
                 'needs_review', 'last_reviewed_by', 'last_reviewed_at'].includes(key)
      );

      for (const fieldKey of customFieldKeys) {
        const distinctValues = [...new Set(prpcData.map(row => row[fieldKey]).filter(Boolean))];
        const existingConfig = configMap.get(fieldKey);

        discoveredFields.push({
          id: existingConfig?.id || `prpc_${fieldKey}`,
          field_name: fieldKey,
          field_label: existingConfig?.field_label || fieldKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          field_type: typeof sampleRow[fieldKey],
          include_in_llm: existingConfig?.include_in_llm ?? false,
          description: existingConfig?.description || null,
          table_name: 'prpc_inferences',
          distinct_values: distinctValues.slice(0, 10),
          sample_count: distinctValues.length
        });
      }
    }

    // Analyze Subscription fields
    if (subscriptionData && subscriptionData.length > 0) {
      const sampleRow = subscriptionData[0];
      const customFieldKeys = Object.keys(sampleRow).filter(
        key => !['id', 'customer_id', 'subscription_id', 'status', 'confidence',
                 'created_at', 'updated_at', 'start_date', 'end_date', 'currency',
                 'billing_period', 'termed', 'evergreen', 'has_ramps', 'has_discounts',
                 'has_cancellation', 'audited', 'audited_at', 'audited_by',
                 'sot_snapshot_hash', 'derivation_trace', 'conflict_flags'].includes(key)
      );

      for (const fieldKey of customFieldKeys) {
        const distinctValues = [...new Set(subscriptionData.map(row => row[fieldKey]).filter(Boolean))];
        const existingConfig = configMap.get(fieldKey);

        // Skip if already added from prpc_inferences
        if (!discoveredFields.find(f => f.field_name === fieldKey)) {
          discoveredFields.push({
            id: existingConfig?.id || `sub_${fieldKey}`,
            field_name: fieldKey,
            field_label: existingConfig?.field_label || fieldKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            field_type: typeof sampleRow[fieldKey],
            include_in_llm: existingConfig?.include_in_llm ?? false,
            description: existingConfig?.description || null,
            table_name: 'subscriptions',
            distinct_values: distinctValues.slice(0, 10),
            sample_count: distinctValues.length
          });
        }
      }
    }

    setFields(discoveredFields);
    setLoading(false);
  };

  const toggleField = async (field: FieldConfig) => {
    const newValue = !field.include_in_llm;
    
    // Check if config exists in database
    if (field.id.startsWith('prpc_') || field.id.startsWith('sub_')) {
      // Create new config
      const { data, error } = await supabase
        .from("customer_field_config")
        .insert({
          customer_id: customerId,
          field_name: field.field_name,
          field_label: field.field_label,
          field_type: field.field_type,
          include_in_llm: newValue,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          // Already exists, update instead
          await supabase
            .from("customer_field_config")
            .update({ include_in_llm: newValue })
            .eq("customer_id", customerId)
            .eq("field_name", field.field_name);
        } else {
          toast.error("Failed to update field");
          console.error(error);
          return;
        }
      }
    } else {
      // Update existing config
      const { error } = await supabase
        .from("customer_field_config")
        .update({ include_in_llm: newValue })
        .eq("id", field.id);

      if (error) {
        toast.error("Failed to update field");
        console.error(error);
        return;
      }
    }

    toast.success(newValue ? "Field included in LLM" : "Field excluded from LLM");
    fetchFields();
  };

  return (
    <>
      {/* Compact Eye-Catching Button */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="outline" 
            className="relative group hover:scale-105 transition-all duration-300 border-2 border-primary/30 hover:border-primary shadow-lg hover:shadow-primary/20 bg-gradient-to-r from-primary/5 to-accent/5"
          >
            <span className="font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Configure Custom Fields for LLM Input
            </span>
            {fields.length > 0 && (
              <Badge 
                variant="secondary" 
                className="ml-2 bg-primary/20 text-primary border-primary/30 group-hover:bg-primary/30 transition-colors"
              >
                {fields.filter(f => f.include_in_llm).length}/{fields.length}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Custom Fields for LLM
            </SheetTitle>
            <SheetDescription>
              Select which custom fields from your data should be included in LLM processing
            </SheetDescription>
          </SheetHeader>

          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Discovering custom fields...
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {/* Field List */}
              {fields.length === 0 ? (
                <Card className="p-6">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm font-medium">No custom fields discovered</p>
                    <p className="text-xs mt-1">Custom fields will appear here when data is available</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-3">
                  {fields.map((field) => (
                    <Card
                      key={field.id}
                      className="p-4 hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <p className="font-semibold text-base">{field.field_label}</p>
                              <Badge variant="outline" className="text-xs">
                                {field.field_type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {field.table_name}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Field: <code className="text-xs bg-muted px-1 py-0.5 rounded">{field.field_name}</code>
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`toggle-${field.id}`} className="text-xs font-medium cursor-pointer whitespace-nowrap">
                              {field.include_in_llm ? "Included" : "Excluded"}
                            </Label>
                            <Switch
                              id={`toggle-${field.id}`}
                              checked={field.include_in_llm}
                              onCheckedChange={() => toggleField(field)}
                            />
                          </div>
                        </div>

                        {/* Distinct Values Preview */}
                        {field.distinct_values && field.distinct_values.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Sample Values ({field.sample_count} unique):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {field.distinct_values.slice(0, 8).map((value, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-xs font-normal max-w-[200px] truncate"
                                >
                                  {String(value)}
                                </Badge>
                              ))}
                              {field.sample_count! > 8 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{field.sample_count! - 8} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Summary */}
              {fields.length > 0 && (
                <Card className="p-3 bg-muted/50">
                  <p className="text-xs text-muted-foreground">
                    <strong>Included fields:</strong> {fields.filter(f => f.include_in_llm).length} / {fields.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only enabled fields will be sent to the LLM for inference processing
                  </p>
                </Card>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
