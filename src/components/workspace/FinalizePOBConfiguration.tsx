import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, FileText, Brain, Table as TableIcon, Edit2, X, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UseCase {
  id: string;
  use_case_name: string;
  description: string;
  category: string;
  triggering: string;
  timing: string;
  product_categories: string[];
  has_waterfall: boolean;
  waterfall_file_name: string | null;
  scenarios: number;
  status: string;
}

interface FinalizePOBConfigurationProps {
  customerId: string;
}

export function FinalizePOBConfiguration({ customerId }: FinalizePOBConfigurationProps) {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<Record<string, 'ai' | 'waterfall'>>({});
  const [editingAI, setEditingAI] = useState<Record<string, boolean>>({});
  const [editingWaterfall, setEditingWaterfall] = useState<Record<string, boolean>>({});
  const [aiEditData, setAiEditData] = useState<Record<string, Partial<UseCase>>>({});
  const [waterfallEditData, setWaterfallEditData] = useState<Record<string, Partial<UseCase>>>({});

  useEffect(() => {
    fetchUseCases();
  }, [customerId]);

  const fetchUseCases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("use_cases")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load use cases");
      console.error(error);
    } else {
      setUseCases(data || []);
      // Initialize with AI as default
      const initialSelection: Record<string, 'ai' | 'waterfall'> = {};
      data?.forEach(uc => {
        initialSelection[uc.id] = 'ai';
      });
      setSelectedSource(initialSelection);
    }
    setLoading(false);
  };

  const handleSelectSource = (useCaseId: string, source: 'ai' | 'waterfall') => {
    setSelectedSource(prev => ({
      ...prev,
      [useCaseId]: source
    }));
  };

  const handleFinalize = async (useCaseId: string) => {
    const source = selectedSource[useCaseId];
    const { error } = await supabase
      .from("use_cases")
      .update({ 
        status: 'finalized',
        metadata: { finalized_source: source, finalized_at: new Date().toISOString() }
      })
      .eq("id", useCaseId);

    if (error) {
      toast.error("Failed to finalize configuration");
      console.error(error);
    } else {
      toast.success(`Configuration finalized using ${source === 'ai' ? 'AI inference' : 'waterfall upload'}`);
      fetchUseCases();
    }
  };

  const startEditingAI = (useCase: UseCase) => {
    setEditingAI({ ...editingAI, [useCase.id]: true });
    setAiEditData({ 
      ...aiEditData, 
      [useCase.id]: {
        category: useCase.category,
        triggering: useCase.triggering,
        timing: useCase.timing,
        product_categories: useCase.product_categories,
        scenarios: useCase.scenarios,
        description: useCase.description
      }
    });
  };

  const startEditingWaterfall = (useCase: UseCase) => {
    setEditingWaterfall({ ...editingWaterfall, [useCase.id]: true });
    setWaterfallEditData({ 
      ...waterfallEditData, 
      [useCase.id]: {
        category: useCase.category,
        triggering: useCase.triggering,
        timing: useCase.timing,
        product_categories: useCase.product_categories,
        scenarios: useCase.scenarios,
        description: useCase.description
      }
    });
  };

  const cancelEditingAI = (useCaseId: string) => {
    setEditingAI({ ...editingAI, [useCaseId]: false });
    setAiEditData({ ...aiEditData, [useCaseId]: {} });
  };

  const cancelEditingWaterfall = (useCaseId: string) => {
    setEditingWaterfall({ ...editingWaterfall, [useCaseId]: false });
    setWaterfallEditData({ ...waterfallEditData, [useCaseId]: {} });
  };

  const saveAIEdit = async (useCaseId: string) => {
    const editData = aiEditData[useCaseId];
    const { error } = await supabase
      .from("use_cases")
      .update(editData)
      .eq("id", useCaseId);

    if (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } else {
      toast.success("AI inferred data updated successfully");
      setEditingAI({ ...editingAI, [useCaseId]: false });
      fetchUseCases();
    }
  };

  const saveWaterfallEdit = async (useCaseId: string) => {
    const editData = waterfallEditData[useCaseId];
    const { error } = await supabase
      .from("use_cases")
      .update(editData)
      .eq("id", useCaseId);

    if (error) {
      toast.error("Failed to save changes");
      console.error(error);
    } else {
      toast.success("Waterfall data updated successfully");
      setEditingWaterfall({ ...editingWaterfall, [useCaseId]: false });
      fetchUseCases();
    }
  };

  const updateAIEditField = (useCaseId: string, field: string, value: any) => {
    setAiEditData({
      ...aiEditData,
      [useCaseId]: {
        ...aiEditData[useCaseId],
        [field]: value
      }
    });
  };

  const updateWaterfallEditField = (useCaseId: string, field: string, value: any) => {
    setWaterfallEditData({
      ...waterfallEditData,
      [useCaseId]: {
        ...waterfallEditData[useCaseId],
        [field]: value
      }
    });
  };

  const addProductCategory = (useCaseId: string, type: 'ai' | 'waterfall', category: string) => {
    if (!category.trim()) return;
    
    if (type === 'ai') {
      const current = aiEditData[useCaseId]?.product_categories || [];
      updateAIEditField(useCaseId, 'product_categories', [...current, category.trim()]);
    } else {
      const current = waterfallEditData[useCaseId]?.product_categories || [];
      updateWaterfallEditField(useCaseId, 'product_categories', [...current, category.trim()]);
    }
  };

  const removeProductCategory = (useCaseId: string, type: 'ai' | 'waterfall', index: number) => {
    if (type === 'ai') {
      const current = aiEditData[useCaseId]?.product_categories || [];
      updateAIEditField(useCaseId, 'product_categories', current.filter((_, i) => i !== index));
    } else {
      const current = waterfallEditData[useCaseId]?.product_categories || [];
      updateWaterfallEditField(useCaseId, 'product_categories', current.filter((_, i) => i !== index));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading configurations...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Finalize POB Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Compare AI-inferred data with customer-uploaded waterfall files and finalize your configuration
        </p>
      </div>

      <div className="space-y-6">
        {useCases.map((useCase) => (
          <Card key={useCase.id} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{useCase.use_case_name}</CardTitle>
                  <CardDescription className="mt-1">{useCase.description}</CardDescription>
                </div>
                <Badge variant={useCase.status === 'finalized' ? 'default' : 'secondary'}>
                  {useCase.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                {/* AI Inferred Data */}
                <div 
                  className={`border-2 rounded-lg p-4 transition-all ${
                    selectedSource[useCase.id] === 'ai' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } ${!editingAI[useCase.id] ? 'cursor-pointer' : ''}`}
                  onClick={() => !editingAI[useCase.id] && handleSelectSource(useCase.id, 'ai')}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">AI Inferred</h3>
                    <div className="ml-auto flex items-center gap-2">
                      {!editingAI[useCase.id] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingAI(useCase);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveAIEdit(useCase.id);
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditingAI(useCase.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {selectedSource[useCase.id] === 'ai' && !editingAI[useCase.id] && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Description</p>
                      {editingAI[useCase.id] ? (
                        <Textarea
                          value={aiEditData[useCase.id]?.description || ''}
                          onChange={(e) => updateAIEditField(useCase.id, 'description', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm">{useCase.description}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      {editingAI[useCase.id] ? (
                        <Input
                          value={aiEditData[useCase.id]?.category || ''}
                          onChange={(e) => updateAIEditField(useCase.id, 'category', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm">{useCase.category}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Triggering</p>
                      {editingAI[useCase.id] ? (
                        <Input
                          value={aiEditData[useCase.id]?.triggering || ''}
                          onChange={(e) => updateAIEditField(useCase.id, 'triggering', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm">{useCase.triggering || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Timing</p>
                      {editingAI[useCase.id] ? (
                        <Input
                          value={aiEditData[useCase.id]?.timing || ''}
                          onChange={(e) => updateAIEditField(useCase.id, 'timing', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm">{useCase.timing || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product Categories</p>
                      {editingAI[useCase.id] ? (
                        <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-1">
                            {(aiEditData[useCase.id]?.product_categories || []).map((cat, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cat}
                                <X
                                  className="h-3 w-3 ml-1 cursor-pointer"
                                  onClick={() => removeProductCategory(useCase.id, 'ai', idx)}
                                />
                              </Badge>
                            ))}
                          </div>
                          <Input
                            placeholder="Add category (press Enter)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addProductCategory(useCase.id, 'ai', e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {useCase.product_categories?.map((cat, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cat}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scenarios</p>
                      {editingAI[useCase.id] ? (
                        <Input
                          type="number"
                          value={aiEditData[useCase.id]?.scenarios || 0}
                          onChange={(e) => updateAIEditField(useCase.id, 'scenarios', parseInt(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                      ) : (
                        <p className="text-sm">{useCase.scenarios} defined</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customer Uploaded Waterfall */}
                <div 
                  className={`border-2 rounded-lg p-4 transition-all ${
                    useCase.has_waterfall 
                      ? `${
                          selectedSource[useCase.id] === 'waterfall' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        } ${!editingWaterfall[useCase.id] ? 'cursor-pointer' : ''}`
                      : 'border-dashed border-muted-foreground/30 bg-muted/20'
                  }`}
                  onClick={() => useCase.has_waterfall && !editingWaterfall[useCase.id] && handleSelectSource(useCase.id, 'waterfall')}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className={`h-5 w-5 ${useCase.has_waterfall ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold text-lg">Customer Waterfall</h3>
                    <div className="ml-auto flex items-center gap-2">
                      {useCase.has_waterfall && !editingWaterfall[useCase.id] ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditingWaterfall(useCase);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      ) : editingWaterfall[useCase.id] ? (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveWaterfallEdit(useCase.id);
                            }}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelEditingWaterfall(useCase.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}
                      {selectedSource[useCase.id] === 'waterfall' && useCase.has_waterfall && !editingWaterfall[useCase.id] && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                  
                  {useCase.has_waterfall ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Waterfall File</p>
                        <div className="flex items-center gap-2 mt-1">
                          <TableIcon className="h-4 w-4" />
                          <p className="text-sm truncate">{useCase.waterfall_file_name}</p>
                        </div>
                      </div>
                      
                      {editingWaterfall[useCase.id] ? (
                        <>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Description</p>
                            <Textarea
                              value={waterfallEditData[useCase.id]?.description || ''}
                              onChange={(e) => updateWaterfallEditField(useCase.id, 'description', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Category</p>
                            <Input
                              value={waterfallEditData[useCase.id]?.category || ''}
                              onChange={(e) => updateWaterfallEditField(useCase.id, 'category', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Triggering</p>
                            <Input
                              value={waterfallEditData[useCase.id]?.triggering || ''}
                              onChange={(e) => updateWaterfallEditField(useCase.id, 'triggering', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Timing</p>
                            <Input
                              value={waterfallEditData[useCase.id]?.timing || ''}
                              onChange={(e) => updateWaterfallEditField(useCase.id, 'timing', e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Product Categories</p>
                            <div className="mt-1 space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-wrap gap-1">
                                {(waterfallEditData[useCase.id]?.product_categories || []).map((cat, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {cat}
                                    <X
                                      className="h-3 w-3 ml-1 cursor-pointer"
                                      onClick={() => removeProductCategory(useCase.id, 'waterfall', idx)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                              <Input
                                placeholder="Add category (press Enter)"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    addProductCategory(useCase.id, 'waterfall', e.currentTarget.value);
                                    e.currentTarget.value = '';
                                  }
                                }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Scenarios</p>
                            <Input
                              type="number"
                              value={waterfallEditData[useCase.id]?.scenarios || 0}
                              onChange={(e) => updateWaterfallEditField(useCase.id, 'scenarios', parseInt(e.target.value))}
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="bg-primary/5 rounded p-3 mt-4">
                          <p className="text-xs text-muted-foreground">
                            Waterfall file contains customer-defined mapping details and configurations
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <TableIcon className="h-12 w-12 text-muted-foreground/30 mb-2" />
                      <p className="text-sm text-muted-foreground">No waterfall file uploaded</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={() => handleFinalize(useCase.id)}
                  disabled={useCase.status === 'finalized'}
                >
                  {useCase.status === 'finalized' ? 'Configuration Finalized' : 'Finalize Configuration'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {useCases.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No use cases found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
