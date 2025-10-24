import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Eye, FileText, Download, CheckSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface UseCase {
  id: string;
  customer_id: string;
  use_case_name: string;
  description: string | null;
  category: string;
  product_categories: string[];
  triggering: string | null;
  timing: string | null;
  has_waterfall: boolean;
  waterfall_file_url: string | null;
  waterfall_file_name: string | null;
  status: string;
  scenarios: number;
  comments: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

interface Scenario {
  id: string;
  use_case_id: string;
  scenario_number: number;
  scenario_name: string;
  description: string | null;
  triggering: string | null;
  timing: string | null;
  billing_impact: string | null;
  revenue_recognition: string | null;
  special_handling: string | null;
  example: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const UseCaseList = ({ customerId }: { customerId: string }) => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [selectedUseCaseIds, setSelectedUseCaseIds] = useState<string[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
    setLoading(false);
  };


  const handleRowClick = async (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    
    // Fetch scenarios for this use case
    const { data, error } = await supabase
      .from("use_case_scenarios")
      .select("*")
      .eq("use_case_id", useCase.id)
      .order("scenario_number", { ascending: true });

    if (error) {
      console.error("Failed to load scenarios:", error);
      setScenarios([]);
    } else {
      setScenarios(data || []);
    }
    
    setDetailsDialogOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || selectedUseCaseIds.length === 0) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${customerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('waterfall-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('waterfall-files')
        .getPublicUrl(filePath);

      // Update all selected use cases
      const updatePromises = selectedUseCaseIds.map(useCaseId =>
        supabase
          .from('use_cases')
          .update({
            has_waterfall: true,
            waterfall_file_url: publicUrl,
            waterfall_file_name: file.name,
            status: 'uploaded',
          })
          .eq('id', useCaseId)
      );

      const results = await Promise.all(updatePromises);
      
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} use case(s)`);
      }

      toast.success(`Waterfall file uploaded for ${selectedUseCaseIds.length} use case(s)`);
      setUploadDialogOpen(false);
      setSelectedUseCaseIds([]);
      fetchUseCases();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const toggleUseCaseSelection = (useCaseId: string) => {
    setSelectedUseCaseIds(prev => {
      if (prev.includes(useCaseId)) {
        return prev.filter(id => id !== useCaseId);
      } else {
        return [...prev, useCaseId];
      }
    });
  };

  const handleDownload = async (useCase: UseCase) => {
    if (!useCase.waterfall_file_url) return;
    
    try {
      const link = document.createElement('a');
      link.href = useCase.waterfall_file_url;
      link.download = useCase.waterfall_file_name || 'waterfall.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading use cases...</div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Use Case List</CardTitle>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Waterfall
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Use Case</TableHead>
                  <TableHead>Product Categories</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Scenarios</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[150px]">Waterfall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No use cases found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  useCases.map((useCase) => (
                    <TableRow
                      key={useCase.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(useCase)}
                    >
                      <TableCell className="font-medium">
                        {useCase.use_case_name}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {useCase.product_categories && useCase.product_categories.length > 0 ? (
                            useCase.product_categories.map((category, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {category}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{useCase.category}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                        {useCase.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        {useCase.scenarios}
                      </TableCell>
                      <TableCell>
                        {useCase.status === "uploaded" ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                            <FileText className="h-3 w-3 mr-1" />
                            Uploaded
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {useCase.status === "uploaded" && useCase.waterfall_file_url ? (
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-success" />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(useCase)}
                              className="h-8 px-2"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
        setUploadDialogOpen(open);
        if (!open) setSelectedUseCaseIds([]);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Waterfall</DialogTitle>
            <DialogDescription>
              Select one or multiple use cases to upload the same waterfall document
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Use Cases ({selectedUseCaseIds.length} selected)</Label>
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {useCases.map((uc) => (
                  <div
                    key={uc.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    onClick={() => toggleUseCaseSelection(uc.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUseCaseIds.includes(uc.id)}
                      onChange={() => toggleUseCaseSelection(uc.id)}
                      className="h-4 w-4 rounded border-gray-300"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{uc.use_case_name}</div>
                      <div className="text-xs text-muted-foreground">{uc.category}</div>
                    </div>
                    {uc.status === "uploaded" && (
                      <Badge variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Has Waterfall
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="waterfall-file">Waterfall File (PDF, Excel, etc.)</Label>
              <Input
                id="waterfall-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.xlsx,.xls,.doc,.docx"
                disabled={uploading || selectedUseCaseIds.length === 0}
              />
              {selectedUseCaseIds.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Please select at least one use case to upload a waterfall
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedUseCaseIds([]);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || selectedUseCaseIds.length === 0}
            >
              {uploading ? "Uploading..." : "Select File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedUseCase?.use_case_name}</DialogTitle>
            <DialogDescription>
              Complete details and scenarios for this use case
            </DialogDescription>
          </DialogHeader>
          {selectedUseCase && (
            <div className="space-y-6 py-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Category</h4>
                <Badge variant="secondary" className="text-sm">{selectedUseCase.category}</Badge>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold mb-2">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedUseCase.description || 'No description available'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">Triggering</h4>
                  <p className="text-sm">{selectedUseCase.triggering || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Timing</h4>
                  <p className="text-sm">{selectedUseCase.timing || '-'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Scenarios</h4>
                  <p className="text-sm font-semibold text-primary">{scenarios.length}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Status</h4>
                  {selectedUseCase.status === "uploaded" ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <FileText className="h-3 w-3 mr-1" />
                      Uploaded
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Pending
                    </Badge>
                  )}
                </div>
              </div>

              {selectedUseCase.comments && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Comments</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedUseCase.comments}
                  </p>
                </div>
              )}

              {selectedUseCase.has_waterfall && selectedUseCase.waterfall_file_name && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Waterfall File</h4>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedUseCase.waterfall_file_name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(selectedUseCase)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              )}

              {/* Scenarios Section */}
              {scenarios.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="text-base font-semibold mb-4">Detailed Scenarios</h4>
                  <Accordion type="single" collapsible className="w-full">
                    {scenarios.map((scenario) => (
                      <AccordionItem key={scenario.id} value={scenario.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="font-mono">
                              #{scenario.scenario_number}
                            </Badge>
                            <span className="font-medium">{scenario.scenario_name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2 pb-2">
                            {scenario.description && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                                <p className="text-sm leading-relaxed">{scenario.description}</p>
                              </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                              {scenario.triggering && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Triggering</p>
                                  <p className="text-sm">{scenario.triggering}</p>
                                </div>
                              )}
                              {scenario.timing && (
                                <div>
                                  <p className="text-sm font-medium text-muted-foreground mb-1">Timing</p>
                                  <p className="text-sm">{scenario.timing}</p>
                                </div>
                              )}
                            </div>

                            {scenario.billing_impact && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Billing Impact</p>
                                <p className="text-sm">{scenario.billing_impact}</p>
                              </div>
                            )}

                            {scenario.revenue_recognition && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Revenue Recognition</p>
                                <p className="text-sm">{scenario.revenue_recognition}</p>
                              </div>
                            )}

                            {scenario.special_handling && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Special Handling</p>
                                <p className="text-sm">{scenario.special_handling}</p>
                              </div>
                            )}

                            {scenario.example && (
                              <div className="bg-muted/50 p-3 rounded-md">
                                <p className="text-sm font-medium text-muted-foreground mb-1">Example</p>
                                <p className="text-sm font-mono">{scenario.example}</p>
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
