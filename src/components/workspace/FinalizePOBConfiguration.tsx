import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Brain, Table as TableIcon } from "lucide-react";
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
                  className={`border-2 rounded-lg p-4 transition-all cursor-pointer ${
                    selectedSource[useCase.id] === 'ai' 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleSelectSource(useCase.id, 'ai')}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">AI Inferred</h3>
                    {selectedSource[useCase.id] === 'ai' && (
                      <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <p className="text-sm">{useCase.category}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Triggering</p>
                      <p className="text-sm">{useCase.triggering || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Timing</p>
                      <p className="text-sm">{useCase.timing || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Product Categories</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {useCase.product_categories?.map((cat, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Scenarios</p>
                      <p className="text-sm">{useCase.scenarios} defined</p>
                    </div>
                  </div>
                </div>

                {/* Customer Uploaded Waterfall */}
                <div 
                  className={`border-2 rounded-lg p-4 transition-all ${
                    useCase.has_waterfall 
                      ? `cursor-pointer ${
                          selectedSource[useCase.id] === 'waterfall' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`
                      : 'border-dashed border-muted-foreground/30 bg-muted/20'
                  }`}
                  onClick={() => useCase.has_waterfall && handleSelectSource(useCase.id, 'waterfall')}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className={`h-5 w-5 ${useCase.has_waterfall ? 'text-primary' : 'text-muted-foreground'}`} />
                    <h3 className="font-semibold text-lg">Customer Waterfall</h3>
                    {selectedSource[useCase.id] === 'waterfall' && useCase.has_waterfall && (
                      <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                    )}
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
                      <div className="bg-primary/5 rounded p-3 mt-4">
                        <p className="text-xs text-muted-foreground">
                          Waterfall file contains customer-defined mapping details and configurations
                        </p>
                      </div>
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
