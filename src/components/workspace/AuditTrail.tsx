import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Edit, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  before_json: any;
  after_json: any;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
}

export const AuditTrail = ({ customerId }: { customerId: string }) => {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { userRole } = useAuth();

  useEffect(() => {
    fetchAuditTrail();
  }, [customerId]);

  const fetchAuditTrail = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast.error("Failed to load audit trail");
      console.error(error);
    } else {
      setAuditEntries(data || []);
    }
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <FileText className="h-4 w-4 text-primary" />;
      case "update":
      case "reclassify":
        return <Edit className="h-4 w-4 text-accent" />;
      case "approve":
        return <CheckCircle className="h-4 w-4 text-success" />;
      case "reject":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-primary/10 text-primary border-primary/20";
      case "update":
      case "reclassify":
        return "bg-accent/10 text-accent border-accent/20";
      case "approve":
        return "bg-success/10 text-success border-success/20";
      case "reject":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const exportAuditLog = () => {
    const csv = [
      ["Timestamp", "Actor", "Entity Type", "Action", "Entity ID"],
      ...auditEntries.map(entry => [
        entry.created_at,
        entry.profiles.email,
        entry.entity_type,
        entry.action,
        entry.entity_id,
      ]),
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${customerId}-${Date.now()}.csv`;
    a.click();
    toast.success("Audit log exported");
  };

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all changes and approvals
        </p>
        <Button variant="outline" size="sm" onClick={exportAuditLog}>
          Export CSV
        </Button>
      </div>

      <div className="space-y-3">
        {auditEntries.map((entry) => (
          <Card key={entry.id}>
            <div className="p-4">
              <div className="flex items-start gap-4">
                <div className="mt-1">{getActionIcon(entry.action)}</div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getActionColor(entry.action)}>
                      {entry.action}
                    </Badge>
                    <Badge variant="secondary">
                      {entry.entity_type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(entry.created_at), "PPp")}
                    </span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">
                      {entry.profiles.full_name || entry.profiles.email}
                    </span>
                    {" "}
                    <span className="text-muted-foreground">
                      {entry.action === "create" && "created"}
                      {entry.action === "update" && "updated"}
                      {entry.action === "approve" && "approved"}
                      {entry.action === "reject" && "rejected"}
                      {entry.action === "reclassify" && "reclassified"}
                    </span>
                    {" "}
                    <span className="text-muted-foreground">
                      {entry.entity_type.replace("_", " ")}
                    </span>
                  </div>

                  {entry.after_json && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        View changes
                      </summary>
                      <div className="mt-2 rounded bg-muted p-2">
                        <pre className="overflow-x-auto">
                          {JSON.stringify(entry.after_json, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {auditEntries.length === 0 && (
        <Card>
          <div className="py-12 text-center text-muted-foreground">
            No audit entries found
          </div>
        </Card>
      )}

      {userRole === "admin" && auditEntries.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button>
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve All Pending Changes
          </Button>
        </div>
      )}
    </div>
  );
};
