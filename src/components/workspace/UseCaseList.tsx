import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Eye, FileText, Download } from "lucide-react";
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

interface UseCase {
  id: string;
  customer_id: string;
  use_case_name: string;
  description: string | null;
  category: string;
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

export const UseCaseList = ({ customerId }: { customerId: string }) => {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
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

  const handleUploadClick = (useCase: UseCase) => {
    setSelectedUseCase(useCase);
    setDialogOpen(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedUseCase) return;

    setUploading(true);
    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${selectedUseCase.id}-${Date.now()}.${fileExt}`;
      const filePath = `${customerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('waterfall-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('waterfall-files')
        .getPublicUrl(filePath);

      // Update use case record
      const { error: updateError } = await supabase
        .from('use_cases')
        .update({
          has_waterfall: true,
          waterfall_file_url: publicUrl,
          waterfall_file_name: file.name,
          status: 'uploaded',
        })
        .eq('id', selectedUseCase.id);

      if (updateError) throw updateError;

      toast.success('Waterfall file uploaded successfully');
      setDialogOpen(false);
      fetchUseCases();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
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
        <CardHeader>
          <CardTitle>Use Case List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Use Case</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Scenarios</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {useCases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No use cases found for this customer.
                    </TableCell>
                  </TableRow>
                ) : (
                  useCases.map((useCase) => (
                    <TableRow key={useCase.id}>
                      <TableCell className="font-medium">
                        {useCase.use_case_name}
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
                      <TableCell>
                        <div className="flex gap-2">
                          {useCase.status === "uploaded" && useCase.waterfall_file_url ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(useCase)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUploadClick(useCase)}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Waterfall File</DialogTitle>
            <DialogDescription>
              Upload a waterfall document for {selectedUseCase?.use_case_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="waterfall-file">Waterfall File (PDF, Excel, etc.)</Label>
              <Input
                id="waterfall-file"
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.xlsx,.xls,.doc,.docx"
                disabled={uploading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Select File"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
