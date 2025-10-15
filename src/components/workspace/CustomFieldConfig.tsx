import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  record_count?: number;
}

export const CustomFieldConfig = ({ customerId }: { customerId: string }) => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tableFilter, setTableFilter] = useState<string>("all");

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
    const discoveredFields: FieldConfig[] = [];

    // Sample values for demonstration
    const sampleValuesByField: Record<string, string[]> = {
      'contract_type': ['Annual', 'Monthly', 'Multi-Year', 'Quarterly'],
      'region': ['North America', 'EMEA', 'APAC', 'LATAM', 'Global'],
      'customer_segment': ['Enterprise', 'Mid-Market', 'SMB', 'Startup'],
      'payment_terms': ['Net 30', 'Net 60', 'Net 90', 'Prepaid', 'Custom'],
      'annual_revenue': ['$100K-$500K', '$500K-$1M', '$1M-$5M', '$5M+'],
      'account_manager': ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis'],
      'renewal_date': ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
      'discount_tier': ['Tier 1', 'Tier 2', 'Tier 3', 'Premium', 'None'],
      'support_level': ['Basic', 'Standard', 'Premium', 'Enterprise', '24/7'],
      'industry_vertical': ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'],
      'company_size': ['1-50', '51-200', '201-1000', '1001-5000', '5000+'],
      'integration_type': ['API', 'Webhook', 'Direct', 'Middleware', 'Custom'],
      'billing_frequency': ['Monthly', 'Quarterly', 'Annual', 'Semi-Annual'],
      'custom_attribute_1': ['Value A', 'Value B', 'Value C'],
      'custom_attribute_2': ['Option 1', 'Option 2', 'Option 3']
    };

    // Add all configured fields first
    existingConfigs?.forEach(config => {
      const sampleValues = sampleValuesByField[config.field_name] || ['Sample 1', 'Sample 2', 'Sample 3'];
      discoveredFields.push({
        id: config.id,
        field_name: config.field_name,
        field_label: config.field_label,
        field_type: config.field_type,
        include_in_llm: config.include_in_llm,
        description: config.description,
        table_name: 'configured',
        distinct_values: sampleValues,
        sample_count: sampleValues.length
      });
    });

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

    // Get record counts
    const { count: prpcCount } = await supabase
      .from("prpc_inferences")
      .select("*", { count: 'exact', head: true })
      .eq("customer_id", customerId);

    const { count: subscriptionCount } = await supabase
      .from("subscriptions")
      .select("*", { count: 'exact', head: true })
      .eq("customer_id", customerId);

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

        // Skip if already added from configs
        if (!discoveredFields.find(f => f.field_name === fieldKey)) {
          discoveredFields.push({
            id: existingConfig?.id || `prpc_${fieldKey}`,
            field_name: fieldKey,
            field_label: existingConfig?.field_label || fieldKey.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            field_type: typeof sampleRow[fieldKey],
            include_in_llm: existingConfig?.include_in_llm ?? false,
            description: existingConfig?.description || null,
            table_name: 'prpc_inferences',
            distinct_values: distinctValues.slice(0, 10),
            sample_count: distinctValues.length,
            record_count: prpcCount || 0
          });
        } else {
          // Update the existing field with actual data
          const idx = discoveredFields.findIndex(f => f.field_name === fieldKey);
          if (idx !== -1) {
            discoveredFields[idx].table_name = 'prpc_inferences';
            discoveredFields[idx].distinct_values = distinctValues.slice(0, 10);
            discoveredFields[idx].sample_count = distinctValues.length;
            discoveredFields[idx].record_count = prpcCount || 0;
          }
        }
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

        // Skip if already added
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
            sample_count: distinctValues.length,
            record_count: subscriptionCount || 0
          });
        } else {
          // Update the existing field with actual data
          const idx = discoveredFields.findIndex(f => f.field_name === fieldKey);
          if (idx !== -1 && discoveredFields[idx].table_name === 'configured') {
            discoveredFields[idx].table_name = 'subscriptions';
            discoveredFields[idx].distinct_values = distinctValues.slice(0, 10);
            discoveredFields[idx].sample_count = distinctValues.length;
            discoveredFields[idx].record_count = subscriptionCount || 0;
          }
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
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
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Custom Fields for LLM Input
            </DialogTitle>
            <DialogDescription>
              Select which custom fields from your data should be included in LLM processing
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Discovering custom fields...
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Table Filter */}
              {fields.length > 0 && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap">Filter by Table:</Label>
                  <Select value={tableFilter} onValueChange={setTableFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Tables" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tables</SelectItem>
                      <SelectItem value="configured">Configured</SelectItem>
                      <SelectItem value="prpc_inferences">PRPC Inferences</SelectItem>
                      <SelectItem value="subscriptions">Subscriptions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* Field List */}
              {fields.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-base font-medium">No custom fields discovered</p>
                    <p className="text-sm mt-2">Custom fields will appear here when data is available in your tables</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {fields
                    .filter(field => tableFilter === "all" || field.table_name === tableFilter)
                    .map((field) => (
                    <Card
                      key={field.id}
                      className="p-4 hover:shadow-md transition-all"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Header */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-base">{field.field_label}</p>
                              <Badge variant="outline" className="text-xs">
                                {field.field_type}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Table: {field.table_name}
                              </Badge>
                              {field.record_count !== undefined && (
                                <Badge variant="outline" className="text-xs bg-primary/5">
                                  {field.record_count.toLocaleString()} records
                                </Badge>
                              )}
                            </div>
                            
                            {/* Field Name */}
                            <p className="text-xs text-muted-foreground">
                              Field Name: <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{field.field_name}</code>
                            </p>
                          </div>
                          
                          {/* Toggle */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Label htmlFor={`toggle-${field.id}`} className="text-sm font-medium cursor-pointer whitespace-nowrap">
                              {field.include_in_llm ? (
                                <span className="text-success">✓ Included</span>
                              ) : (
                                <span className="text-muted-foreground">Excluded</span>
                              )}
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
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Field Values ({field.sample_count} unique):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {field.distinct_values.slice(0, 12).map((value, idx) => (
                                <Badge 
                                  key={idx} 
                                  variant="outline" 
                                  className="text-xs font-normal max-w-[250px] truncate"
                                >
                                  {String(value)}
                                </Badge>
                              ))}
                              {field.sample_count! > 12 && (
                                <Badge variant="secondary" className="text-xs font-medium">
                                  +{field.sample_count! - 12} more
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

              {/* Summary Footer */}
              {fields.length > 0 && (
                <>
                  <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">
                          Configuration Summary
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {fields.filter(f => f.include_in_llm).length} of {fields.length} fields will be included in LLM processing
                        </p>
                      </div>
                      <Badge className="text-base px-4 py-2">
                        {fields.filter(f => f.include_in_llm).length}/{fields.length}
                      </Badge>
                    </div>
                  </Card>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        toast.success("LLM field configuration saved successfully");
                        setDialogOpen(false);
                      }}
                      className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
                    >
                      Save Configuration
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
