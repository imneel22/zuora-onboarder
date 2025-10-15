import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, X, Save } from "lucide-react";
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
}

export const CustomFieldConfig = ({ customerId }: { customerId: string }) => {
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newField, setNewField] = useState({
    field_name: "",
    field_label: "",
    field_type: "text",
    description: "",
  });

  useEffect(() => {
    fetchFields();
  }, [customerId]);

  const fetchFields = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("customer_field_config")
      .select("*")
      .eq("customer_id", customerId)
      .order("field_label");

    if (error) {
      toast.error("Failed to load field configurations");
      console.error(error);
    } else {
      setFields(data || []);
    }
    setLoading(false);
  };

  const toggleField = async (fieldId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from("customer_field_config")
      .update({ include_in_llm: !currentValue })
      .eq("id", fieldId);

    if (error) {
      toast.error("Failed to update field");
      console.error(error);
    } else {
      toast.success("Field configuration updated");
      fetchFields();
    }
  };

  const addField = async () => {
    if (!newField.field_name || !newField.field_label) {
      toast.error("Field name and label are required");
      return;
    }

    const { error } = await supabase.from("customer_field_config").insert({
      customer_id: customerId,
      field_name: newField.field_name,
      field_label: newField.field_label,
      field_type: newField.field_type,
      description: newField.description || null,
      include_in_llm: true,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("A field with this name already exists");
      } else {
        toast.error("Failed to add field");
      }
      console.error(error);
    } else {
      toast.success("Field added successfully");
      setNewField({ field_name: "", field_label: "", field_type: "text", description: "" });
      setDialogOpen(false);
      fetchFields();
    }
  };

  const deleteField = async (fieldId: string) => {
    const { error } = await supabase
      .from("customer_field_config")
      .delete()
      .eq("id", fieldId);

    if (error) {
      toast.error("Failed to delete field");
      console.error(error);
    } else {
      toast.success("Field deleted successfully");
      fetchFields();
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading field configuration...</div>;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Custom Fields for LLM</h3>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Field
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
              <DialogDescription>
                Configure a custom field that can be included in LLM processing
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="field_name">Field Name (Database Key)</Label>
                <Input
                  id="field_name"
                  placeholder="e.g., custom_attribute_1"
                  value={newField.field_name}
                  onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="field_label">Field Label (Display Name)</Label>
                <Input
                  id="field_label"
                  placeholder="e.g., Custom Attribute"
                  value={newField.field_label}
                  onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="field_type">Field Type</Label>
                <Input
                  id="field_type"
                  placeholder="e.g., text, number, boolean"
                  value={newField.field_type}
                  onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="Brief description of this field"
                  value={newField.description}
                  onChange={(e) => setNewField({ ...newField, description: e.target.value })}
                />
              </div>
              <Button onClick={addField} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No custom fields configured</p>
          <p className="text-xs mt-1">Add fields to include them in LLM processing</p>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{field.field_label}</p>
                  <Badge variant="outline" className="text-xs">
                    {field.field_type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Key: <code className="text-xs bg-muted px-1 py-0.5 rounded">{field.field_name}</code>
                </p>
                {field.description && (
                  <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`toggle-${field.id}`} className="text-xs text-muted-foreground cursor-pointer">
                    {field.include_in_llm ? "Included" : "Excluded"}
                  </Label>
                  <Switch
                    id={`toggle-${field.id}`}
                    checked={field.include_in_llm}
                    onCheckedChange={() => toggleField(field.id, field.include_in_llm)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteField(field.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-muted/50 rounded-md">
        <p className="text-xs text-muted-foreground">
          <strong>Included fields:</strong> {fields.filter(f => f.include_in_llm).length} / {fields.length}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Only enabled fields will be sent to the LLM for inference processing
        </p>
      </div>
    </Card>
  );
};
